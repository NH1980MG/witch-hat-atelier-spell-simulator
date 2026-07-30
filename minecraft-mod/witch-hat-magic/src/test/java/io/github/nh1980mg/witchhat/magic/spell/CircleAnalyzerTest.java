package io.github.nh1980mg.witchhat.magic.spell;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookStroke;
import io.github.nh1980mg.witchhat.magic.notebook.PlacedSymbol;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

final class CircleAnalyzerTest {
    private static final double DELTA = 1.0E-2;

    @Test
    void findsTheSigilNearestThePageCenter() {
        NotebookPage page = pageWith(List.of(),
                symbol("feu", 0.3F, 0.5F),
                symbol("eau", 0.48F, 0.5F));

        assertTrue(CircleAnalyzer.centralSigil(page).isPresent());
        assertEquals("eau", CircleAnalyzer.centralSigil(page).get().symbolId());
    }

    @Test
    void ignoresSignsWhenLookingForTheCentralSigil() {
        NotebookPage page = pageWith(List.of(), symbol("orbe", 0.5F, 0.5F));

        assertTrue(CircleAnalyzer.centralSigil(page).isEmpty());
    }

    @Test
    void detectsAClosedStroke() {
        assertTrue(CircleAnalyzer.isClosed(regularCircle(0.5, 0.5, 0.3, 32)));
        assertFalse(CircleAnalyzer.isClosed(openArc(0.5, 0.5, 0.3, 32)));
    }

    @Test
    void detectsEnclosureWithPointInPolygon() {
        NotebookStroke circle = regularCircle(0.5, 0.5, 0.3, 32);

        assertTrue(CircleAnalyzer.encloses(circle, new NormalizedPoint(0.5F, 0.5F)));
        assertFalse(CircleAnalyzer.encloses(circle, new NormalizedPoint(0.05F, 0.05F)));
    }

    @Test
    void reportsNoCircleWhenStrokesAreOpen() {
        NotebookPage page = pageWith(List.of(openArc(0.5, 0.5, 0.3, 32)), centralSigil());

        assertEquals(CircleEvaluation.Verdict.NO_CIRCLE,
                CircleAnalyzer.evaluate(page, CircleSupport.NOTEBOOK).verdict());
    }

    @Test
    void reportsNoCircleWhenTheStrokeDoesNotEncloseTheSigil() {
        NotebookStroke farCircle = regularCircle(0.15, 0.15, 0.08, 24);
        NotebookPage page = pageWith(List.of(farCircle), centralSigil());

        assertEquals(CircleEvaluation.Verdict.NO_CIRCLE,
                CircleAnalyzer.evaluate(page, CircleSupport.NOTEBOOK).verdict());
    }

    @Test
    void reportsIrregularForAWobblyCircle() {
        NotebookStroke wobbly = wobblyCircle(0.5, 0.5, 0.3, 48);
        NotebookPage page = pageWith(List.of(wobbly), centralSigil());

        assertEquals(CircleEvaluation.Verdict.IRREGULAR,
                CircleAnalyzer.evaluate(page, CircleSupport.NOTEBOOK).verdict());
    }

    @Test
    void picksTheLargestEnclosingCircle() {
        NotebookStroke small = regularCircle(0.5, 0.5, 0.15, 24);
        NotebookStroke large = regularCircle(0.5, 0.5, 0.35, 40);
        NotebookPage page = pageWith(List.of(small, large), centralSigil());

        CircleEvaluation evaluation = CircleAnalyzer.evaluate(page, CircleSupport.NOTEBOOK);

        assertEquals(CircleEvaluation.Verdict.VALID, evaluation.verdict());
        // diameter 0.7 → 2 × 0.7 × 0.5 = 0.7, clamped inside [0.5, 1.0]
        assertEquals(0.7, evaluation.power(), DELTA);
    }

    @Test
    void clampsPowerToTheSupportLimits() {
        NotebookStroke wide = regularCircle(0.5, 0.5, 0.5, 48);
        NotebookPage page = pageWith(List.of(wide), centralSigil());

        assertEquals(1.0, CircleAnalyzer.evaluate(page, CircleSupport.NOTEBOOK).power(), DELTA);
        assertEquals(1.5, CircleAnalyzer.evaluate(page, CircleSupport.CANVAS_SQUARE).power(), DELTA);
        assertEquals(3.0, CircleAnalyzer.evaluate(page, CircleSupport.LARGE_CANVAS).power(), DELTA);
    }

    @Test
    void floorsPowerAtHalfStrengthForTinyCircles() {
        NotebookStroke tiny = regularCircle(0.5, 0.5, 0.08, 16);
        NotebookPage page = pageWith(List.of(tiny), centralSigil());

        assertEquals(0.5, CircleAnalyzer.evaluate(page, CircleSupport.NOTEBOOK).power(), DELTA);
    }

    @Test
    void scoresRegularCirclesAboveWobblyOnes() {
        double regular = CircleAnalyzer.regularityScore(regularCircle(0.5, 0.5, 0.3, 40));
        double wobbly = CircleAnalyzer.regularityScore(wobblyCircle(0.5, 0.5, 0.3, 40));

        assertTrue(regular > wobbly, "regular " + regular + " should beat wobbly " + wobbly);
        assertTrue(regular > 0.9);
    }

    @Test
    void mapsPrecisionToDurationBetweenThreeAndFifteenSeconds() {
        NotebookPage precise = pageWith(List.of(regularCircle(0.5, 0.5, 0.3, 48)), centralSigil());

        CircleEvaluation evaluation = CircleAnalyzer.evaluate(precise, CircleSupport.NOTEBOOK);

        assertTrue(evaluation.durationTicks() >= 60);
        assertTrue(evaluation.durationTicks() <= 300);
        assertTrue(evaluation.durationTicks() > 240,
                "a near-perfect circle should last most of the 15s span, got " + evaluation.durationTicks());
    }

    private static PlacedSymbol centralSigil() {
        return symbol("feu", 0.5F, 0.5F);
    }

    private static PlacedSymbol symbol(String id, float x, float y) {
        return new PlacedSymbol(id, new NormalizedPoint(x, y), 0.15F, 0.0F);
    }

    private static NotebookPage pageWith(List<NotebookStroke> strokes, PlacedSymbol... symbols) {
        return new NotebookPage("page-1", "Page 1", strokes, List.of(symbols));
    }

    private static NotebookStroke regularCircle(double cx, double cy, double radius, int samples) {
        List<NormalizedPoint> points = new ArrayList<>();
        for (int index = 0; index < samples; index++) {
            double angle = 2.0 * Math.PI * index / samples;
            points.add(new NormalizedPoint(
                    (float) (cx + radius * Math.cos(angle)),
                    (float) (cy + radius * Math.sin(angle))));
        }
        return new NotebookStroke(points);
    }

    private static NotebookStroke openArc(double cx, double cy, double radius, int samples) {
        List<NormalizedPoint> points = new ArrayList<>();
        for (int index = 0; index <= samples; index++) {
            double angle = Math.PI * index / samples;
            points.add(new NormalizedPoint(
                    (float) (cx + radius * Math.cos(angle)),
                    (float) (cy + radius * Math.sin(angle))));
        }
        return new NotebookStroke(points);
    }

    private static NotebookStroke wobblyCircle(double cx, double cy, double radius, int samples) {
        List<NormalizedPoint> points = new ArrayList<>();
        for (int index = 0; index <= samples; index++) {
            double angle = 2.0 * Math.PI * index / samples;
            double wobble = radius * (1.0 + 0.35 * Math.sin(5 * angle));
            points.add(new NormalizedPoint(
                    (float) (cx + wobble * Math.cos(angle)),
                    (float) (cy + wobble * Math.sin(angle))));
        }
        return new NotebookStroke(points);
    }
}
