package io.github.nh1980mg.witchhat.magic.notebook;

import io.github.nh1980mg.witchhat.magic.symbol.MagicSymbolCatalog;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public final class NotebookLimits {
    public static final int MAX_PAGES = 64;
    public static final int MAX_STROKES_PER_PAGE = 256;
    public static final int MAX_POINTS_PER_STROKE = 1_024;
    public static final int MAX_SYMBOLS_PER_PAGE = 128;
    public static final float MIN_SYMBOL_SIZE = 0.04F;
    public static final float MAX_SYMBOL_SIZE = 0.75F;
    public static final float MIN_GUIDE_SIZE = 0.2F;
    public static final float MAX_GUIDE_SIZE = 1.0F;
    public static final float MIN_GUIDE_OPACITY = 0.1F;
    public static final float MAX_GUIDE_OPACITY = 0.8F;

    private NotebookLimits() {
    }

    public static NotebookData validate(NotebookData data) {
        Objects.requireNonNull(data, "data");
        if (data.formatVersion() != NotebookData.CURRENT_FORMAT) {
            throw new IllegalArgumentException("Unsupported notebook format: " + data.formatVersion());
        }
        if (data.pages().isEmpty() || data.pages().size() > MAX_PAGES) {
            throw new IllegalArgumentException("Invalid notebook page count: " + data.pages().size());
        }

        Set<String> pageIds = new HashSet<>();
        for (NotebookPage page : data.pages()) {
            validatePage(page);
            if (!pageIds.add(page.id())) {
                throw new IllegalArgumentException("Duplicate notebook page id: " + page.id());
            }
        }
        if (!pageIds.contains(data.selectedPageId())) {
            throw new IllegalArgumentException("Selected notebook page is missing");
        }
        for (NotebookPage page : data.pages()) {
            page.guide().ifPresent(guide -> {
                if (guide.sourcePageId().equals(page.id())) {
                    throw new IllegalArgumentException("A page cannot guide itself");
                }
                if (!pageIds.contains(guide.sourcePageId())) {
                    throw new IllegalArgumentException("Tracing guide source page is missing");
                }
            });
        }
        return data;
    }

    private static void validatePage(NotebookPage page) {
        if (page.id().isBlank() || page.id().length() > NotebookPage.MAX_ID_LENGTH) {
            throw new IllegalArgumentException("Invalid notebook page id");
        }
        if (page.title().isBlank() || page.title().length() > NotebookPage.MAX_TITLE_LENGTH) {
            throw new IllegalArgumentException("Invalid notebook page title");
        }
        if (page.strokes().size() > MAX_STROKES_PER_PAGE) {
            throw new IllegalArgumentException("Too many strokes on notebook page: " + page.id());
        }

        for (NotebookStroke stroke : page.strokes()) {
            if (stroke.points().isEmpty() || stroke.points().size() > MAX_POINTS_PER_STROKE) {
                throw new IllegalArgumentException("Invalid stroke point count");
            }
            stroke.points().forEach(NotebookLimits::validatePoint);
        }
        if (page.symbols().size() > MAX_SYMBOLS_PER_PAGE) {
            throw new IllegalArgumentException("Too many symbols on notebook page: " + page.id());
        }
        page.symbols().forEach(NotebookLimits::validateSymbol);
        page.guide().ifPresent(NotebookLimits::validateGuide);
    }

    private static void validatePoint(NormalizedPoint point) {
        if (!Float.isFinite(point.x())
                || !Float.isFinite(point.y())
                || point.x() < 0.0F
                || point.x() > 1.0F
                || point.y() < 0.0F
                || point.y() > 1.0F) {
            throw new IllegalArgumentException("Point is outside the normalized page");
        }
    }

    private static void validateSymbol(PlacedSymbol symbol) {
        if (symbol.symbolId().isBlank()
                || symbol.symbolId().length() > PlacedSymbol.MAX_ID_LENGTH
                || !symbol.symbolId().matches("[a-z0-9_-]+")
                || !MagicSymbolCatalog.contains(symbol.symbolId())) {
            throw new IllegalArgumentException("Invalid symbol identifier");
        }
        validatePoint(symbol.center());
        if (!Float.isFinite(symbol.size())
                || symbol.size() < MIN_SYMBOL_SIZE
                || symbol.size() > MAX_SYMBOL_SIZE) {
            throw new IllegalArgumentException("Invalid symbol size");
        }
        if (!Float.isFinite(symbol.rotationDegrees())) {
            throw new IllegalArgumentException("Invalid symbol rotation");
        }

        double dx = symbol.center().x() - 0.5;
        double dy = symbol.center().y() - 0.5;
        double cornerRadius = symbol.size() * Math.sqrt(2.0) / 2.0;
        if (Math.sqrt(dx * dx + dy * dy) + cornerRadius > 0.5) {
            throw new IllegalArgumentException("Symbol is outside the circular page");
        }
    }

    private static void validateGuide(TracingGuide guide) {
        if (guide.sourcePageId().isBlank()
                || guide.sourcePageId().length() > NotebookPage.MAX_ID_LENGTH) {
            throw new IllegalArgumentException("Invalid tracing guide source");
        }
        validatePoint(guide.center());
        if (!Float.isFinite(guide.size())
                || guide.size() < MIN_GUIDE_SIZE
                || guide.size() > MAX_GUIDE_SIZE) {
            throw new IllegalArgumentException("Invalid tracing guide size");
        }
        if (!Float.isFinite(guide.opacity())
                || guide.opacity() < MIN_GUIDE_OPACITY
                || guide.opacity() > MAX_GUIDE_OPACITY) {
            throw new IllegalArgumentException("Invalid tracing guide opacity");
        }
        double dx = guide.center().x() - 0.5;
        double dy = guide.center().y() - 0.5;
        if (Math.sqrt(dx * dx + dy * dy) + guide.size() / 2.0 > 0.5) {
            throw new IllegalArgumentException("Tracing guide is outside the circular page");
        }
    }
}
