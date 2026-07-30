package io.github.nh1980mg.witchhat.magic.spell;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookStroke;
import io.github.nh1980mg.witchhat.magic.notebook.PlacedSymbol;
import io.github.nh1980mg.witchhat.magic.symbol.MagicSymbolCatalog;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Analyses hand-drawn strokes to find the largest closed circle enclosing the
 * central sigil, then derives spell power (circle diameter) and precision
 * (closure, radius regularity, centering). All geometry uses page-normalized
 * coordinates where the drawable circle has radius 0.5 around (0.5, 0.5).
 */
public final class CircleAnalyzer {
    private static final double PAGE_CENTER = 0.5;
    private static final double MIN_CLOSURE_GAP = 0.06;
    private static final double PATH_CLOSURE_RATIO = 0.04;
    private static final double MAX_CLOSURE_GAP = 0.10;
    private static final double CLOSURE_SCORE_SPAN = 0.15;
    private static final double MAX_REGULARITY_CV = 0.25;
    private static final double CENTERING_SCORE_SPAN = 0.15;
    private static final double MIN_REGULARITY_SCORE = 0.40;
    private static final double MIN_CENTERING_SCORE = 0.30;
    private static final double CLOSURE_WEIGHT = 0.25;
    private static final double REGULARITY_WEIGHT = 0.45;
    private static final double CENTERING_WEIGHT = 0.30;
    private static final double MIN_POWER = 0.5;
    private static final int MIN_DURATION_TICKS = 60; // 3 seconds
    private static final int DURATION_SPAN_TICKS = 240; // up to +12 seconds

    private CircleAnalyzer() {}

    public static Optional<PlacedSymbol> centralSigil(NotebookPage page) {
        Objects.requireNonNull(page, "page");
        return page.symbols().stream()
                .filter(CircleAnalyzer::isSigil)
                .min(Comparator.comparingDouble(symbol -> distance(symbol.center(), PAGE_CENTER, PAGE_CENTER)));
    }

    public static CircleEvaluation evaluate(NotebookPage page, CircleSupport support) {
        Objects.requireNonNull(page, "page");
        Objects.requireNonNull(support, "support");
        Optional<PlacedSymbol> sigil = centralSigil(page);
        if (sigil.isEmpty()) {
            return CircleEvaluation.noCircle();
        }
        NormalizedPoint sigilCenter = sigil.get().center();
        Optional<NotebookStroke> circle = page.strokes().stream()
                .filter(stroke -> stroke.points().size() >= 3)
                .filter(CircleAnalyzer::isClosed)
                .filter(stroke -> encloses(stroke, sigilCenter))
                .max(Comparator.comparingDouble(CircleAnalyzer::meanRadius));
        if (circle.isEmpty()) {
            return CircleEvaluation.noCircle();
        }
        NotebookStroke stroke = circle.get();
        double regularity = regularityScore(stroke);
        double centering = centeringScore(stroke, sigilCenter);
        double closure = closureScore(stroke);
        double precision = CLOSURE_WEIGHT * closure
                + REGULARITY_WEIGHT * regularity
                + CENTERING_WEIGHT * centering;
        if (regularity < MIN_REGULARITY_SCORE || centering < MIN_CENTERING_SCORE) {
            return CircleEvaluation.irregular(precision);
        }
        double diameter = 2.0 * meanRadius(stroke); // page diameter normalizes to 1.0
        double rawPower = 2.0 * diameter * support.sizeWeight();
        double power = Math.max(MIN_POWER, Math.min(support.maxPower(), rawPower));
        int durationTicks = MIN_DURATION_TICKS + (int) Math.round(precision * DURATION_SPAN_TICKS);
        return CircleEvaluation.valid(power, precision, durationTicks);
    }

    static boolean isClosed(NotebookStroke stroke) {
        List<NormalizedPoint> points = stroke.points();
        if (points.size() < 3) {
            return false;
        }
        double gap = distance(points.getFirst(), points.getLast());
        double tolerance = Math.min(MAX_CLOSURE_GAP,
                Math.max(MIN_CLOSURE_GAP, PATH_CLOSURE_RATIO * pathLength(points)));
        return gap <= tolerance;
    }

    static boolean encloses(NotebookStroke stroke, NormalizedPoint point) {
        List<NormalizedPoint> points = stroke.points();
        boolean inside = false;
        for (int index = 0; index < points.size(); index++) {
            NormalizedPoint a = points.get(index);
            NormalizedPoint b = points.get((index + 1) % points.size());
            boolean crosses = (a.y() > point.y()) != (b.y() > point.y());
            if (crosses) {
                double intersectX = a.x() + (double) (point.y() - a.y()) / (b.y() - a.y()) * (b.x() - a.x());
                if (intersectX > point.x()) {
                    inside = !inside;
                }
            }
        }
        return inside;
    }

    static double closureScore(NotebookStroke stroke) {
        List<NormalizedPoint> points = stroke.points();
        double gap = distance(points.getFirst(), points.getLast());
        return 1.0 - clamp01(gap / CLOSURE_SCORE_SPAN);
    }

    static double regularityScore(NotebookStroke stroke) {
        List<NormalizedPoint> points = stroke.points();
        double meanRadius = meanRadius(stroke);
        if (meanRadius <= 1.0E-6) {
            return 0.0;
        }
        NormalizedPoint centroid = centroid(points);
        double variance = 0.0;
        for (NormalizedPoint point : points) {
            double deviation = distance(point, centroid) - meanRadius;
            variance += deviation * deviation;
        }
        double coefficientOfVariation = Math.sqrt(variance / points.size()) / meanRadius;
        return 1.0 - clamp01(coefficientOfVariation / MAX_REGULARITY_CV);
    }

    static double centeringScore(NotebookStroke stroke, NormalizedPoint sigilCenter) {
        double offset = distance(centroid(stroke.points()), sigilCenter);
        return 1.0 - clamp01(offset / CENTERING_SCORE_SPAN);
    }

    private static boolean isSigil(PlacedSymbol symbol) {
        return MagicSymbolCatalog.entries().stream()
                .anyMatch(entry -> entry.id().equals(symbol.symbolId())
                        && entry.category() == MagicSymbolCatalog.Category.SIGIL);
    }

    private static double meanRadius(NotebookStroke stroke) {
        List<NormalizedPoint> points = stroke.points();
        if (points.isEmpty()) {
            return 0.0;
        }
        NormalizedPoint centroid = centroid(points);
        double total = 0.0;
        for (NormalizedPoint point : points) {
            total += distance(point, centroid);
        }
        return total / points.size();
    }

    private static NormalizedPoint centroid(List<NormalizedPoint> points) {
        double sumX = 0.0;
        double sumY = 0.0;
        for (NormalizedPoint point : points) {
            sumX += point.x();
            sumY += point.y();
        }
        return new NormalizedPoint((float) (sumX / points.size()), (float) (sumY / points.size()));
    }

    private static double pathLength(List<NormalizedPoint> points) {
        double length = 0.0;
        for (int index = 1; index < points.size(); index++) {
            length += distance(points.get(index - 1), points.get(index));
        }
        return length;
    }

    private static double distance(NormalizedPoint point, double x, double y) {
        return Math.hypot(point.x() - x, point.y() - y);
    }

    private static double distance(NormalizedPoint first, NormalizedPoint second) {
        return distance(first, second.x(), second.y());
    }

    private static double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }
}
