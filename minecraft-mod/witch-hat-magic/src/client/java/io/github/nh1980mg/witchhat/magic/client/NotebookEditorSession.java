package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookLimits;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookStroke;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Objects;

public final class NotebookEditorSession {
    private static final int MAX_HISTORY = 64;

    private final Deque<NotebookData> undoHistory = new ArrayDeque<>();
    private final Deque<NotebookData> redoHistory = new ArrayDeque<>();
    private NotebookData data;
    private List<NormalizedPoint> activeStroke;

    public NotebookEditorSession(NotebookData initialData) {
        data = NotebookLimits.validate(Objects.requireNonNull(initialData, "initialData"));
    }

    public boolean beginStroke(
            double pointerX,
            double pointerY,
            double canvasLeft,
            double canvasTop,
            double canvasDiameter) {
        NormalizedPoint point = normalize(pointerX, pointerY, canvasLeft, canvasTop, canvasDiameter);
        if (!isInsideCircle(point)) {
            activeStroke = null;
            return false;
        }
        activeStroke = new ArrayList<>();
        activeStroke.add(point);
        return true;
    }

    public void appendPoint(
            double pointerX,
            double pointerY,
            double canvasLeft,
            double canvasTop,
            double canvasDiameter) {
        if (activeStroke == null) {
            return;
        }
        NormalizedPoint point = clampToCircle(
                normalize(pointerX, pointerY, canvasLeft, canvasTop, canvasDiameter));
        if (!point.equals(activeStroke.getLast())) {
            activeStroke.add(point);
        }
    }

    public void endStroke() {
        if (activeStroke == null || activeStroke.isEmpty()) {
            activeStroke = null;
            return;
        }

        List<NotebookStroke> strokes = new ArrayList<>(data.selectedPage().strokes());
        strokes.add(new NotebookStroke(activeStroke));
        NotebookPage selected = data.selectedPage();
        commit(data.replaceSelectedPage(
                new NotebookPage(selected.id(), selected.title(), strokes)));
        activeStroke = null;
    }

    public boolean eraseAt(
            double pointerX,
            double pointerY,
            double canvasLeft,
            double canvasTop,
            double canvasDiameter,
            double radiusPixels) {
        NormalizedPoint target = normalize(
                pointerX, pointerY, canvasLeft, canvasTop, canvasDiameter);
        if (!isInsideCircle(target) || radiusPixels < 0.0 || canvasDiameter <= 0.0) {
            return false;
        }

        double radius = radiusPixels / canvasDiameter;
        double radiusSquared = radius * radius;
        List<NotebookStroke> strokes = new ArrayList<>(data.selectedPage().strokes());
        for (int index = strokes.size() - 1; index >= 0; index--) {
            if (isStrokeNear(strokes.get(index), target, radiusSquared)) {
                strokes.remove(index);
                NotebookPage selected = data.selectedPage();
                commit(data.replaceSelectedPage(
                        new NotebookPage(selected.id(), selected.title(), strokes)));
                return true;
            }
        }
        return false;
    }

    public void undo() {
        if (undoHistory.isEmpty()) {
            return;
        }
        redoHistory.push(data);
        data = undoHistory.pop();
        activeStroke = null;
    }

    public void redo() {
        if (redoHistory.isEmpty()) {
            return;
        }
        pushBounded(undoHistory, data);
        data = redoHistory.pop();
        activeStroke = null;
    }

    public void clear() {
        NotebookPage selected = data.selectedPage();
        if (selected.strokes().isEmpty()) {
            return;
        }
        commit(data.replaceSelectedPage(
                new NotebookPage(selected.id(), selected.title(), List.of())));
    }

    public void previousPage() {
        int selected = data.selectedPageIndex();
        if (selected > 0) {
            data = data.selectPage(selected - 1);
            activeStroke = null;
        }
    }

    public void nextPage() {
        int selected = data.selectedPageIndex();
        if (selected + 1 < data.pages().size()) {
            data = data.selectPage(selected + 1);
            activeStroke = null;
        }
    }

    public void addPage() {
        commit(data.addPage());
        activeStroke = null;
    }

    public void deletePage() {
        NotebookData changed = data.removeSelectedPage();
        if (changed != data) {
            commit(changed);
        }
        activeStroke = null;
    }

    public boolean canUndo() {
        return !undoHistory.isEmpty();
    }

    public boolean canRedo() {
        return !redoHistory.isEmpty();
    }

    public List<NormalizedPoint> activeStroke() {
        return activeStroke == null ? List.of() : List.copyOf(activeStroke);
    }

    public NotebookData snapshot() {
        return NotebookLimits.validate(data);
    }

    public void acceptAuthoritative(NotebookData authoritative) {
        data = NotebookLimits.validate(authoritative);
        undoHistory.clear();
        redoHistory.clear();
        activeStroke = null;
    }

    private void commit(NotebookData changed) {
        NotebookData validated = NotebookLimits.validate(changed);
        if (validated.equals(data)) {
            return;
        }
        pushBounded(undoHistory, data);
        redoHistory.clear();
        data = validated;
    }

    private static void pushBounded(Deque<NotebookData> history, NotebookData value) {
        history.push(value);
        while (history.size() > MAX_HISTORY) {
            history.removeLast();
        }
    }

    private static NormalizedPoint normalize(
            double pointerX,
            double pointerY,
            double canvasLeft,
            double canvasTop,
            double canvasDiameter) {
        if (!Double.isFinite(canvasDiameter) || canvasDiameter <= 0.0) {
            throw new IllegalArgumentException("Canvas diameter must be positive");
        }
        return new NormalizedPoint(
                (float) ((pointerX - canvasLeft) / canvasDiameter),
                (float) ((pointerY - canvasTop) / canvasDiameter));
    }

    private static boolean isInsideCircle(NormalizedPoint point) {
        double dx = point.x() - 0.5;
        double dy = point.y() - 0.5;
        return dx * dx + dy * dy <= 0.25;
    }

    private static NormalizedPoint clampToCircle(NormalizedPoint point) {
        double dx = point.x() - 0.5;
        double dy = point.y() - 0.5;
        double distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= 0.5) {
            return point;
        }
        double scale = 0.5 / distance;
        return new NormalizedPoint(
                (float) (0.5 + dx * scale),
                (float) (0.5 + dy * scale));
    }

    private static boolean isStrokeNear(
            NotebookStroke stroke,
            NormalizedPoint target,
            double radiusSquared) {
        for (NormalizedPoint point : stroke.points()) {
            double dx = point.x() - target.x();
            double dy = point.y() - target.y();
            if (dx * dx + dy * dy <= radiusSquared) {
                return true;
            }
        }
        return false;
    }
}
