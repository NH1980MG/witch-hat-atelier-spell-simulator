package io.github.nh1980mg.witchhat.magic.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookStroke;
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

    private static NotebookEditorSession sessionWithOneStroke() {
        NotebookEditorSession session = new NotebookEditorSession(NotebookData.createDefault());
        session.beginStroke(200.0, 200.0, 100.0, 100.0, 200.0);
        session.appendPoint(220.0, 200.0, 100.0, 100.0, 200.0);
        session.endStroke();
        return session;
    }
}
