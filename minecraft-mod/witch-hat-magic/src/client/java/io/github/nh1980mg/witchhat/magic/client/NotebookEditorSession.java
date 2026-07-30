package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookLimits;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookStroke;
import io.github.nh1980mg.witchhat.magic.notebook.PlacedSymbol;
import io.github.nh1980mg.witchhat.magic.notebook.TracingGuide;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public final class NotebookEditorSession {
    private static final int MAX_HISTORY = 64;

    private final Deque<NotebookData> undoHistory = new ArrayDeque<>();
    private final Deque<NotebookData> redoHistory = new ArrayDeque<>();
    private NotebookData data;
    private List<NormalizedPoint> activeStroke;
    private SymbolSelection symbolSelection = SymbolSelection.empty();
    private List<Integer> strokeSelection = List.of();

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
                new NotebookPage(
                        selected.id(), selected.title(), strokes, selected.symbols(), selected.guide())));
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
                        new NotebookPage(
                                selected.id(), selected.title(), strokes, selected.symbols(), selected.guide())));
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
        clearSelection();
    }

    public void redo() {
        if (redoHistory.isEmpty()) {
            return;
        }
        pushBounded(undoHistory, data);
        data = redoHistory.pop();
        activeStroke = null;
        clearSelection();
    }

    public void clear() {
        NotebookPage selected = data.selectedPage();
        if (selected.strokes().isEmpty()) {
            return;
        }
        commit(data.replaceSelectedPage(
                new NotebookPage(
                        selected.id(), selected.title(), List.of(), selected.symbols(), selected.guide())));
    }

    public void previousPage() {
        int selected = data.selectedPageIndex();
        if (selected > 0) {
            data = data.selectPage(selected - 1);
            activeStroke = null;
            clearSelection();
        }
    }

    public void nextPage() {
        int selected = data.selectedPageIndex();
        if (selected + 1 < data.pages().size()) {
            data = data.selectPage(selected + 1);
            activeStroke = null;
            clearSelection();
        }
    }

    public void addPage() {
        commit(data.addPage());
        activeStroke = null;
        clearSelection();
    }

    public void deletePage() {
        NotebookData changed = data.removeSelectedPage();
        if (changed != data) {
            commit(changed);
        }
        activeStroke = null;
        clearSelection();
    }

    public void renamePage(String title) {
        commit(data.renameSelectedPage(title));
        clearSelection();
    }

    public void duplicatePage() {
        commit(data.duplicateSelectedPage());
        activeStroke = null;
        clearSelection();
    }

    public void movePage(int delta) {
        commit(data.moveSelectedPage(delta));
        activeStroke = null;
        clearSelection();
    }

    public void selectPage(int index) {
        data = data.selectPage(index);
        activeStroke = null;
        clearSelection();
    }

    public boolean setGuideSource(int pageIndex) {
        if (pageIndex < 0 || pageIndex >= data.pages().size()) {
            return false;
        }
        NotebookPage selected = data.selectedPage();
        NotebookPage source = data.pages().get(pageIndex);
        if (source.id().equals(selected.id())) {
            return false;
        }
        TracingGuide guide = selected.guide()
                .map(existing -> existing.withSource(source.id()).withVisible(true))
                .orElseGet(() -> TracingGuide.createDefault(source.id()));
        commit(data.replaceSelectedPage(selected.withGuide(Optional.of(guide))));
        return true;
    }

    public boolean cycleGuideSource(int delta) {
        if (delta != -1 && delta != 1) {
            return false;
        }
        List<NotebookPage> candidates = data.pages().stream()
                .filter(page -> !page.id().equals(data.selectedPageId()))
                .toList();
        if (candidates.isEmpty()) {
            return false;
        }
        String currentId = data.selectedPage().guide()
                .map(TracingGuide::sourcePageId)
                .orElse(candidates.getFirst().id());
        int current = 0;
        for (int index = 0; index < candidates.size(); index++) {
            if (candidates.get(index).id().equals(currentId)) {
                current = index;
                break;
            }
        }
        NotebookPage next = candidates.get(Math.floorMod(current + delta, candidates.size()));
        return setGuideSource(data.pages().indexOf(next));
    }

    public boolean toggleGuide() {
        NotebookPage selected = data.selectedPage();
        if (selected.guide().isEmpty()) {
            for (int index = 0; index < data.pages().size(); index++) {
                if (!data.pages().get(index).id().equals(selected.id())) {
                    return setGuideSource(index);
                }
            }
            return false;
        }
        TracingGuide guide = selected.guide().orElseThrow();
        commit(data.replaceSelectedPage(selected.withGuide(
                Optional.of(guide.withVisible(!guide.visible())))));
        return true;
    }

    public boolean resizeGuide(float delta) {
        NotebookPage selected = data.selectedPage();
        if (selected.guide().isEmpty() || !Float.isFinite(delta)) {
            return false;
        }
        TracingGuide guide = selected.guide().orElseThrow();
        NotebookData changed = data.replaceSelectedPage(selected.withGuide(
                Optional.of(guide.withSize(guide.size() + delta))));
        if (!isValid(changed)) {
            return false;
        }
        commit(changed);
        return true;
    }

    public Optional<NotebookPage> guideSourcePage() {
        return data.selectedPage().guide().flatMap(guide -> data.pages().stream()
                .filter(page -> page.id().equals(guide.sourcePageId()))
                .findFirst());
    }

    public boolean placeSymbol(String symbolId, NormalizedPoint center, float size) {
        NotebookPage selected = data.selectedPage();
        if (selected.symbols().size() >= NotebookLimits.MAX_SYMBOLS_PER_PAGE) {
            return false;
        }
        List<PlacedSymbol> symbols = new ArrayList<>(selected.symbols());
        symbols.add(new PlacedSymbol(symbolId, center, size, 0.0F));
        NotebookData changed = data.replaceSelectedPage(
                new NotebookPage(
                        selected.id(), selected.title(), selected.strokes(), symbols, selected.guide()));
        if (!isValid(changed)) {
            return false;
        }
        commit(changed);
        symbolSelection = SymbolSelection.single(symbols.size() - 1);
        return true;
    }

    public boolean selectSymbolAt(NormalizedPoint point) {
        List<PlacedSymbol> symbols = data.selectedPage().symbols();
        for (int index = symbols.size() - 1; index >= 0; index--) {
            if (SymbolSelection.contains(symbols.get(index), point)) {
                if (!symbolSelection.indices().contains(index)) {
                    symbolSelection = SymbolSelection.single(index);
                }
                strokeSelection = List.of();
                return true;
            }
        }
        clearSelection();
        return false;
    }

    public void selectSymbolsInBox(NormalizedPoint start, NormalizedPoint end) {
        symbolSelection = SymbolSelection.intersecting(
                data.selectedPage().symbols(), start, end);
        SymbolSelection.Bounds marquee = new SymbolSelection.Bounds(
                Math.min(start.x(), end.x()),
                Math.min(start.y(), end.y()),
                Math.max(start.x(), end.x()),
                Math.max(start.y(), end.y()));
        List<Integer> strokes = new ArrayList<>();
        List<NotebookStroke> pageStrokes = data.selectedPage().strokes();
        for (int index = 0; index < pageStrokes.size(); index++) {
            SymbolSelection.Bounds bounds = strokeBounds(pageStrokes.get(index));
            if (bounds != null && marquee.intersects(bounds)) {
                strokes.add(index);
            }
        }
        strokeSelection = List.copyOf(strokes);
    }

    private static SymbolSelection.Bounds strokeBounds(NotebookStroke stroke) {
        if (stroke.points().isEmpty()) {
            return null;
        }
        float minX = Float.MAX_VALUE;
        float minY = Float.MAX_VALUE;
        float maxX = -Float.MAX_VALUE;
        float maxY = -Float.MAX_VALUE;
        for (NormalizedPoint point : stroke.points()) {
            minX = Math.min(minX, point.x());
            minY = Math.min(minY, point.y());
            maxX = Math.max(maxX, point.x());
            maxY = Math.max(maxY, point.y());
        }
        return new SymbolSelection.Bounds(minX, minY, maxX, maxY);
    }

    public void clearSelection() {
        symbolSelection = SymbolSelection.empty();
        strokeSelection = List.of();
    }

    public boolean hasSelection() {
        return !symbolSelection.isEmpty() || !strokeSelection.isEmpty();
    }

    public List<Integer> selectedStrokeIndices() {
        return strokeSelection;
    }

    public boolean moveSelection(float deltaX, float deltaY) {
        if (!hasSelection()
                || !Float.isFinite(deltaX)
                || !Float.isFinite(deltaY)) {
            return false;
        }
        NotebookPage selected = data.selectedPage();
        List<PlacedSymbol> symbols = new ArrayList<>(selected.symbols());
        for (int index : symbolSelection.indices()) {
            PlacedSymbol symbol = symbols.get(index);
            symbols.set(index, symbol.withCenter(new NormalizedPoint(
                    symbol.center().x() + deltaX,
                    symbol.center().y() + deltaY)));
        }
        List<NotebookStroke> strokes = new ArrayList<>(selected.strokes());
        for (int index : strokeSelection) {
            NotebookStroke stroke = strokes.get(index);
            strokes.set(index, new NotebookStroke(stroke.points().stream()
                    .map(point -> new NormalizedPoint(
                            point.x() + deltaX, point.y() + deltaY))
                    .toList()));
        }
        return commitPageIfValid(selected, strokes, symbols);
    }

    private boolean commitPageIfValid(
            NotebookPage selected,
            List<NotebookStroke> strokes,
            List<PlacedSymbol> symbols) {
        NotebookData changed = data.replaceSelectedPage(
                new NotebookPage(
                        selected.id(), selected.title(), strokes, symbols, selected.guide()));
        if (!isValid(changed)) {
            return false;
        }
        commit(changed);
        return true;
    }

    public boolean resizeSelection(float scale) {
        if (!hasSelection() || !Float.isFinite(scale) || scale <= 0.0F) {
            return false;
        }
        NotebookPage selected = data.selectedPage();
        SymbolSelection.Bounds bounds = selectedBounds();
        if (bounds == null) {
            return false;
        }
        List<PlacedSymbol> symbols = new ArrayList<>(selected.symbols());
        for (int index : symbolSelection.indices()) {
            PlacedSymbol symbol = symbols.get(index);
            NormalizedPoint center = new NormalizedPoint(
                    bounds.centerX() + (symbol.center().x() - bounds.centerX()) * scale,
                    bounds.centerY() + (symbol.center().y() - bounds.centerY()) * scale);
            symbols.set(index, new PlacedSymbol(
                    symbol.symbolId(),
                    center,
                    symbol.size() * scale,
                    symbol.rotationDegrees()));
        }
        List<NotebookStroke> strokes = new ArrayList<>(selected.strokes());
        for (int index : strokeSelection) {
            NotebookStroke stroke = strokes.get(index);
            strokes.set(index, new NotebookStroke(stroke.points().stream()
                    .map(point -> new NormalizedPoint(
                            bounds.centerX() + (point.x() - bounds.centerX()) * scale,
                            bounds.centerY() + (point.y() - bounds.centerY()) * scale))
                    .toList()));
        }
        return commitPageIfValid(selected, strokes, symbols);
    }

    public boolean deleteSelection() {
        if (!hasSelection()) {
            return false;
        }
        NotebookPage selected = data.selectedPage();
        List<PlacedSymbol> symbols = new ArrayList<>(selected.symbols());
        symbolSelection.indices().stream()
                .sorted((left, right) -> Integer.compare(right, left))
                .forEach(index -> symbols.remove((int) index));
        List<NotebookStroke> strokes = new ArrayList<>(selected.strokes());
        strokeSelection.stream()
                .sorted((left, right) -> Integer.compare(right, left))
                .forEach(index -> strokes.remove((int) index));
        NotebookData changed = data.replaceSelectedPage(
                new NotebookPage(
                        selected.id(), selected.title(), strokes, symbols, selected.guide()));
        commit(changed);
        clearSelection();
        return true;
    }

    public List<Integer> selectedSymbolIndices() {
        return symbolSelection.indices();
    }

    public SymbolSelection.Bounds selectedSymbolBounds() {
        return symbolSelection.bounds(data.selectedPage().symbols());
    }

    public SymbolSelection.Bounds selectedBounds() {
        SymbolSelection.Bounds bounds = symbolSelection.bounds(data.selectedPage().symbols());
        List<NotebookStroke> strokes = data.selectedPage().strokes();
        for (int index : strokeSelection) {
            if (index < 0 || index >= strokes.size()) {
                continue;
            }
            SymbolSelection.Bounds strokeBounds = strokeBounds(strokes.get(index));
            if (strokeBounds != null) {
                bounds = bounds == null ? strokeBounds : bounds.union(strokeBounds);
            }
        }
        return bounds;
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
        clearSelection();
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

    private boolean commitSymbolsIfValid(
            NotebookPage selected,
            List<PlacedSymbol> symbols) {
        NotebookData changed = data.replaceSelectedPage(
                new NotebookPage(
                        selected.id(), selected.title(), selected.strokes(), symbols, selected.guide()));
        if (!isValid(changed)) {
            return false;
        }
        commit(changed);
        return true;
    }

    private static boolean isValid(NotebookData candidate) {
        try {
            NotebookLimits.validate(candidate);
            return true;
        } catch (IllegalArgumentException exception) {
            return false;
        }
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
