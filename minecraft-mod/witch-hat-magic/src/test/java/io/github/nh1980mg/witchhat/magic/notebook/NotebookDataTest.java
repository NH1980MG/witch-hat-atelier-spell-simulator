package io.github.nh1980mg.witchhat.magic.notebook;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
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
}
