package io.github.nh1980mg.witchhat.magic.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookStroke;
import io.github.nh1980mg.witchhat.magic.notebook.PlacedSymbol;
import java.util.List;
import org.junit.jupiter.api.Test;

class NotebookEditorSessionTest {
    @Test
    void convertsCanvasCoordinatesToNormalizedPoints() {
        NotebookEditorSession session = new NotebookEditorSession(NotebookData.createDefault());

        assertTrue(session.beginStroke(150.0, 300.0, 100.0, 200.0, 200.0));
        session.appendPoint(250.0, 300.0, 100.0, 200.0, 200.0);
        session.endStroke();

        List<NormalizedPoint> points = session.snapshot()
                .selectedPage()
                .strokes()
                .getFirst()
                .points();
        assertEquals(new NormalizedPoint(0.25F, 0.5F), points.getFirst());
        assertEquals(new NormalizedPoint(0.75F, 0.5F), points.getLast());
    }

    @Test
    void ignoresStrokeStartsOutsideTheCircularPage() {
        NotebookEditorSession session = new NotebookEditorSession(NotebookData.createDefault());

        assertFalse(session.beginStroke(100.0, 100.0, 100.0, 100.0, 200.0));
        session.endStroke();

        assertTrue(session.snapshot().selectedPage().strokes().isEmpty());
    }

    @Test
    void clampsDraggedPointsToTheCircularPageEdge() {
        NotebookEditorSession session = new NotebookEditorSession(NotebookData.createDefault());

        session.beginStroke(200.0, 200.0, 100.0, 100.0, 200.0);
        session.appendPoint(400.0, 200.0, 100.0, 100.0, 200.0);
        session.endStroke();

        NormalizedPoint edge = session.snapshot()
                .selectedPage()
                .strokes()
                .getFirst()
                .points()
                .getLast();
        assertEquals(1.0F, edge.x(), 0.0001F);
        assertEquals(0.5F, edge.y(), 0.0001F);
    }

    @Test
    void supportsUndoAndRedoForACompletedStroke() {
        NotebookEditorSession session = sessionWithOneStroke();

        session.undo();
        assertTrue(session.snapshot().selectedPage().strokes().isEmpty());
        assertTrue(session.canRedo());

        session.redo();
        assertEquals(1, session.snapshot().selectedPage().strokes().size());
        assertTrue(session.canUndo());
    }

    @Test
    void clearsAndRestoresTheSelectedPage() {
        NotebookEditorSession session = sessionWithOneStroke();

        session.clear();
        assertTrue(session.snapshot().selectedPage().strokes().isEmpty());

        session.undo();
        assertEquals(1, session.snapshot().selectedPage().strokes().size());
    }

    @Test
    void navigatesCreatesAndDeletesPages() {
        NotebookEditorSession session = new NotebookEditorSession(NotebookData.createDefault());

        session.addPage();
        assertEquals(2, session.snapshot().pages().size());
        assertEquals(1, session.snapshot().selectedPageIndex());

        session.previousPage();
        assertEquals(0, session.snapshot().selectedPageIndex());
        session.nextPage();
        assertEquals(1, session.snapshot().selectedPageIndex());

        session.deletePage();
        assertEquals(1, session.snapshot().pages().size());
        session.deletePage();
        assertEquals(1, session.snapshot().pages().size());
    }

    @Test
    void erasesTheNearestStrokeAsOneUndoableOperation() {
        NotebookEditorSession session = sessionWithOneStroke();

        assertTrue(session.eraseAt(200.0, 200.0, 100.0, 100.0, 200.0, 12.0));
        assertTrue(session.snapshot().selectedPage().strokes().isEmpty());

        session.undo();
        assertEquals(1, session.snapshot().selectedPage().strokes().size());
    }

    @Test
    void snapshotsDoNotShareMutablePageLists() {
        NotebookPage page = new NotebookPage(
                "page-1",
                "Page 1",
                List.of(new NotebookStroke(List.of(new NormalizedPoint(0.5F, 0.5F)))));
        NotebookData initial = new NotebookData(
                NotebookData.CURRENT_FORMAT, page.id(), List.of(page));
        NotebookEditorSession session = new NotebookEditorSession(initial);

        NotebookData snapshot = session.snapshot();
        session.clear();

        assertNotSame(snapshot, session.snapshot());
        assertEquals(1, snapshot.selectedPage().strokes().size());
        assertTrue(session.snapshot().selectedPage().strokes().isEmpty());
    }

    @Test
    void placesAValidatedSymbolAsOneUndoableOperation() {
        NotebookEditorSession session = new NotebookEditorSession(NotebookData.createDefault());

        assertTrue(session.placeSymbol("feu", new NormalizedPoint(0.5F, 0.5F), 0.2F));
        assertEquals(1, session.snapshot().selectedPage().symbols().size());
        assertEquals(List.of(0), session.selectedSymbolIndices());

        session.undo();
        assertTrue(session.snapshot().selectedPage().symbols().isEmpty());
    }

    @Test
    void rightClickSelectsTheTopmostSymbolAndEmptySpaceClearsSelection() {
        NotebookEditorSession session = sessionWithSymbols(
                symbol("feu", 0.5F, 0.5F, 0.3F),
                symbol("eau", 0.5F, 0.5F, 0.15F));

        assertTrue(session.selectSymbolAt(new NormalizedPoint(0.5F, 0.5F)));
        assertEquals(List.of(1), session.selectedSymbolIndices());

        assertFalse(session.selectSymbolAt(new NormalizedPoint(0.1F, 0.5F)));
        assertTrue(session.selectedSymbolIndices().isEmpty());
    }

    @Test
    void marqueeSelectsEveryIntersectingSymbol() {
        NotebookEditorSession session = sessionWithSymbols(
                symbol("feu", 0.35F, 0.5F, 0.16F),
                symbol("eau", 0.55F, 0.5F, 0.16F),
                symbol("terre", 0.75F, 0.5F, 0.10F));

        session.selectSymbolsInBox(
                new NormalizedPoint(0.25F, 0.4F),
                new NormalizedPoint(0.62F, 0.6F));

        assertEquals(List.of(0, 1), session.selectedSymbolIndices());
    }

    @Test
    void movesSelectedSymbolsTogetherAndKeepsThemInsideThePage() {
        NotebookEditorSession session = sessionWithSymbols(
                symbol("feu", 0.4F, 0.5F, 0.12F),
                symbol("eau", 0.6F, 0.5F, 0.12F));
        session.selectSymbolsInBox(
                new NormalizedPoint(0.3F, 0.4F),
                new NormalizedPoint(0.7F, 0.6F));

        assertTrue(session.moveSelection(0.1F, 0.0F));
        assertEquals(0.5F, session.snapshot().selectedPage().symbols().get(0).center().x(), 0.0001F);
        assertEquals(0.7F, session.snapshot().selectedPage().symbols().get(1).center().x(), 0.0001F);
        assertFalse(session.moveSelection(0.5F, 0.0F));

        session.undo();
        assertEquals(0.4F, session.snapshot().selectedPage().symbols().get(0).center().x(), 0.0001F);
    }

    @Test
    void resizesAndDeletesTheSelectionWithUndo() {
        NotebookEditorSession session = sessionWithSymbols(
                symbol("feu", 0.4F, 0.5F, 0.12F),
                symbol("eau", 0.6F, 0.5F, 0.12F));
        session.selectSymbolsInBox(
                new NormalizedPoint(0.3F, 0.4F),
                new NormalizedPoint(0.7F, 0.6F));

        assertTrue(session.resizeSelection(1.5F));
        assertEquals(0.18F, session.snapshot().selectedPage().symbols().getFirst().size(), 0.0001F);
        assertEquals(0.35F, session.snapshot().selectedPage().symbols().getFirst().center().x(), 0.0001F);

        assertTrue(session.deleteSelection());
        assertTrue(session.snapshot().selectedPage().symbols().isEmpty());
        session.undo();
        assertEquals(2, session.snapshot().selectedPage().symbols().size());
    }

    @Test
    void drawingAndClearingPreservePlacedSymbols() {
        NotebookEditorSession session = sessionWithSymbols(
                symbol("feu", 0.5F, 0.5F, 0.2F));

        session.beginStroke(200.0, 200.0, 100.0, 100.0, 200.0);
        session.endStroke();
        session.clear();

        assertEquals(1, session.snapshot().selectedPage().symbols().size());
    }

    private static NotebookEditorSession sessionWithOneStroke() {
        NotebookEditorSession session = new NotebookEditorSession(NotebookData.createDefault());
        session.beginStroke(200.0, 200.0, 100.0, 100.0, 200.0);
        session.appendPoint(220.0, 200.0, 100.0, 100.0, 200.0);
        session.endStroke();
        return session;
    }

    private static NotebookEditorSession sessionWithSymbols(PlacedSymbol... symbols) {
        NotebookPage page = new NotebookPage(
                "page-1", "Page 1", List.of(), List.of(symbols));
        return new NotebookEditorSession(new NotebookData(
                NotebookData.CURRENT_FORMAT, page.id(), List.of(page)));
    }

    private static PlacedSymbol symbol(
            String id,
            float x,
            float y,
            float size) {
        return new PlacedSymbol(id, new NormalizedPoint(x, y), size, 0.0F);
    }
}
