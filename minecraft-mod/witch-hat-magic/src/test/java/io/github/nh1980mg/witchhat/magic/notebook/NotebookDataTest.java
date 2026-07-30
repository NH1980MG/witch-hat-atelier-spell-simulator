package io.github.nh1980mg.witchhat.magic.notebook;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class NotebookDataTest {
    @Test
    void createsOneBlankSelectedPage() {
        NotebookData data = NotebookData.createDefault();

        assertEquals(NotebookData.CURRENT_FORMAT, data.formatVersion());
        assertEquals(1, data.pages().size());
        assertEquals(data.pages().getFirst().id(), data.selectedPageId());
        assertEquals(List.of(), data.selectedPage().strokes());
    }

    @Test
    void addsAndSelectsANewPage() {
        NotebookData data = NotebookData.createDefault().addPage();

        assertEquals(2, data.pages().size());
        assertEquals("page-2", data.selectedPageId());
        assertEquals("Page 2", data.selectedPage().title());
    }

    @Test
    void removesSelectedPageButAlwaysKeepsOnePage() {
        NotebookData data = NotebookData.createDefault()
                .addPage()
                .removeSelectedPage()
                .removeSelectedPage();

        assertEquals(1, data.pages().size());
        assertEquals(data.pages().getFirst().id(), data.selectedPageId());
    }

    @Test
    void replacesOnlyTheSelectedPageAndCopiesInputLists() {
        NotebookData original = NotebookData.createDefault().addPage();
        NotebookStroke stroke = new NotebookStroke(List.of(
                new NormalizedPoint(0.25F, 0.5F),
                new NormalizedPoint(0.75F, 0.5F)));
        NotebookPage replacement = new NotebookPage(
                original.selectedPageId(), "Fire circle", List.of(stroke));

        NotebookData changed = original.replaceSelectedPage(replacement);

        assertNotSame(original, changed);
        assertEquals(List.of(), original.selectedPage().strokes());
        assertEquals("Fire circle", changed.selectedPage().title());
        assertEquals(1, changed.selectedPage().strokes().size());
        assertThrows(UnsupportedOperationException.class, () -> changed.pages().clear());
    }

    @Test
    void rejectsCoordinatesOutsideTheNormalizedPage() {
        NotebookData invalid = dataWithPoint(new NormalizedPoint(1.01F, 0.5F));

        assertThrows(IllegalArgumentException.class, () -> NotebookLimits.validate(invalid));
    }

    @Test
    void rejectsNonFiniteCoordinates() {
        NotebookData invalid = dataWithPoint(new NormalizedPoint(Float.NaN, 0.5F));

        assertThrows(IllegalArgumentException.class, () -> NotebookLimits.validate(invalid));
    }

    @Test
    void rejectsMoreThanSixtyFourPages() {
        List<NotebookPage> pages = IntStream.rangeClosed(1, NotebookLimits.MAX_PAGES + 1)
                .mapToObj(index -> NotebookPage.blank("page-" + index, "Page " + index))
                .toList();
        NotebookData invalid = new NotebookData(
                NotebookData.CURRENT_FORMAT, "page-1", pages);

        assertThrows(IllegalArgumentException.class, () -> NotebookLimits.validate(invalid));
    }

    @Test
    void rejectsTooManyStrokes() {
        List<NotebookStroke> strokes = IntStream
                .rangeClosed(0, NotebookLimits.MAX_STROKES_PER_PAGE)
                .mapToObj(index -> new NotebookStroke(List.of(new NormalizedPoint(0.5F, 0.5F))))
                .toList();
        NotebookPage page = new NotebookPage("page-1", "Page 1", strokes);
        NotebookData invalid = new NotebookData(
                NotebookData.CURRENT_FORMAT, page.id(), List.of(page));

        assertThrows(IllegalArgumentException.class, () -> NotebookLimits.validate(invalid));
    }

    @Test
    void rejectsTooManyPointsInAStroke() {
        List<NormalizedPoint> points = IntStream
                .rangeClosed(0, NotebookLimits.MAX_POINTS_PER_STROKE)
                .mapToObj(index -> new NormalizedPoint(0.5F, 0.5F))
                .toList();
        NotebookData invalid = dataWithStroke(new NotebookStroke(points));

        assertThrows(IllegalArgumentException.class, () -> NotebookLimits.validate(invalid));
    }

    @Test
    void storesPlacedSymbolsWithoutSharingMutableLists() {
        PlacedSymbol symbol = new PlacedSymbol(
                "feu",
                new NormalizedPoint(0.5F, 0.5F),
                0.24F,
                45.0F);
        NotebookPage page = new NotebookPage(
                "page-1", "Page 1", List.of(), List.of(symbol));
        NotebookData data = new NotebookData(
                NotebookData.CURRENT_FORMAT, page.id(), List.of(page));

        NotebookLimits.validate(data);

        assertEquals(symbol, data.selectedPage().symbols().getFirst());
        assertThrows(
                UnsupportedOperationException.class,
                () -> data.selectedPage().symbols().clear());
    }

    @Test
    void rejectsInvalidPlacedSymbolGeometryAndIdentifiers() {
        assertInvalidSymbol(new PlacedSymbol(
                "", new NormalizedPoint(0.5F, 0.5F), 0.2F, 0.0F));
        assertInvalidSymbol(new PlacedSymbol(
                "feu", new NormalizedPoint(0.95F, 0.5F), 0.2F, 0.0F));
        assertInvalidSymbol(new PlacedSymbol(
                "feu", new NormalizedPoint(0.5F, 0.5F), 0.01F, 0.0F));
        assertInvalidSymbol(new PlacedSymbol(
                "feu", new NormalizedPoint(0.5F, 0.5F), 0.2F, Float.NaN));
        assertInvalidSymbol(new PlacedSymbol(
                "unknown", new NormalizedPoint(0.5F, 0.5F), 0.2F, 0.0F));
    }

    @Test
    void rejectsTooManyPlacedSymbols() {
        List<PlacedSymbol> symbols = IntStream
                .rangeClosed(0, NotebookLimits.MAX_SYMBOLS_PER_PAGE)
                .mapToObj(index -> new PlacedSymbol(
                        "feu",
                        new NormalizedPoint(0.5F, 0.5F),
                        0.1F,
                        0.0F))
                .toList();
        NotebookPage page = new NotebookPage(
                "page-1", "Page 1", List.of(), symbols);
        NotebookData invalid = new NotebookData(
                NotebookData.CURRENT_FORMAT, page.id(), List.of(page));

        assertThrows(IllegalArgumentException.class, () -> NotebookLimits.validate(invalid));
    }

    @Test
    void blankPagesStartWithoutPlacedSymbols() {
        assertTrue(NotebookData.createDefault().selectedPage().symbols().isEmpty());
    }

    @Test
    void renamesTheSelectedPageWithoutChangingItsStableId() {
        NotebookData original = NotebookData.createDefault();

        NotebookData renamed = original.renameSelectedPage("Fire practice");

        assertEquals(original.selectedPageId(), renamed.selectedPageId());
        assertEquals("Fire practice", renamed.selectedPage().title());
        assertEquals("Page 1", original.selectedPage().title());
        assertThrows(
                IllegalArgumentException.class,
                () -> original.renameSelectedPage(" ".repeat(4)));
    }

    @Test
    void duplicatesTheSelectedPageWithAUniqueIdAndCopiedContent() {
        NotebookPage source = new NotebookPage(
                "page-1",
                "Fire",
                List.of(new NotebookStroke(List.of(new NormalizedPoint(0.5F, 0.5F)))),
                List.of(new PlacedSymbol(
                        "feu",
                        new NormalizedPoint(0.5F, 0.5F),
                        0.2F,
                        0.0F)));
        NotebookData original = new NotebookData(
                NotebookData.CURRENT_FORMAT, source.id(), List.of(source));

        NotebookData duplicated = original.duplicateSelectedPage();

        assertEquals(2, duplicated.pages().size());
        assertEquals("page-2", duplicated.selectedPageId());
        assertEquals("Fire copy", duplicated.selectedPage().title());
        assertEquals(source.strokes(), duplicated.selectedPage().strokes());
        assertEquals(source.symbols(), duplicated.selectedPage().symbols());
        assertNotSame(source, duplicated.selectedPage());
    }

    @Test
    void reordersTheSelectedPageAndKeepsItSelected() {
        NotebookData data = NotebookData.createDefault().addPage().addPage();
        String selectedId = data.selectedPageId();

        NotebookData movedLeft = data.moveSelectedPage(-1);
        NotebookData movedRight = movedLeft.moveSelectedPage(1);

        assertEquals(selectedId, movedLeft.pages().get(1).id());
        assertEquals(selectedId, movedLeft.selectedPageId());
        assertEquals(selectedId, movedRight.pages().get(2).id());
        assertEquals(movedRight, movedRight.moveSelectedPage(1));
    }

    @Test
    void storesAnOptionalTracingGuideThatReferencesAnotherPage() {
        NotebookPage source = NotebookPage.blank("page-1", "Source");
        TracingGuide guide = new TracingGuide(
                source.id(),
                new NormalizedPoint(0.5F, 0.5F),
                0.8F,
                0.35F,
                true);
        NotebookPage target = new NotebookPage(
                "page-2", "Target", List.of(), List.of(), Optional.of(guide));
        NotebookData data = new NotebookData(
                NotebookData.CURRENT_FORMAT, target.id(), List.of(source, target));

        NotebookLimits.validate(data);

        assertEquals(guide, data.selectedPage().guide().orElseThrow());
        assertTrue(NotebookPage.blank("blank", "Blank").guide().isEmpty());
    }

    @Test
    void rejectsMissingSelfReferencingAndInvalidTracingGuides() {
        assertInvalidGuide(new TracingGuide(
                "page-2", new NormalizedPoint(0.5F, 0.5F), 0.8F, 0.35F, true));
        assertInvalidGuide(new TracingGuide(
                "missing", new NormalizedPoint(0.5F, 0.5F), 0.8F, 0.35F, true));
        assertInvalidGuide(new TracingGuide(
                "page-1", new NormalizedPoint(0.5F, 0.5F), 0.1F, 0.35F, true));
        assertInvalidGuide(new TracingGuide(
                "page-1", new NormalizedPoint(0.5F, 0.5F), 0.8F, 1.1F, true));
    }

    private static NotebookData dataWithPoint(NormalizedPoint point) {
        return dataWithStroke(new NotebookStroke(List.of(point)));
    }

    private static NotebookData dataWithStroke(NotebookStroke stroke) {
        NotebookPage page = new NotebookPage("page-1", "Page 1", List.of(stroke));
        return new NotebookData(NotebookData.CURRENT_FORMAT, page.id(), List.of(page));
    }

    private static void assertInvalidSymbol(PlacedSymbol symbol) {
        NotebookPage page = new NotebookPage(
                "page-1", "Page 1", List.of(), List.of(symbol));
        NotebookData invalid = new NotebookData(
                NotebookData.CURRENT_FORMAT, page.id(), List.of(page));
        assertThrows(IllegalArgumentException.class, () -> NotebookLimits.validate(invalid));
    }

    private static void assertInvalidGuide(TracingGuide guide) {
        NotebookPage source = NotebookPage.blank("page-1", "Source");
        NotebookPage target = new NotebookPage(
                "page-2", "Target", List.of(), List.of(), Optional.of(guide));
        NotebookData invalid = new NotebookData(
                NotebookData.CURRENT_FORMAT, target.id(), List.of(source, target));
        assertThrows(IllegalArgumentException.class, () -> NotebookLimits.validate(invalid));
    }
}
