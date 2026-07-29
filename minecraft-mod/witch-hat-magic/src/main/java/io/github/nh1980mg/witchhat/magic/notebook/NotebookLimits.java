package io.github.nh1980mg.witchhat.magic.notebook;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public final class NotebookLimits {
    public static final int MAX_PAGES = 64;
    public static final int MAX_STROKES_PER_PAGE = 256;
    public static final int MAX_POINTS_PER_STROKE = 1_024;

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
}
