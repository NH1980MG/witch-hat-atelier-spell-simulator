package io.github.nh1980mg.witchhat.magic.network;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookLimits;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookStroke;
import java.util.List;
import java.util.stream.IntStream;
import net.minecraft.SharedConstants;
import net.minecraft.server.Bootstrap;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class NotebookSaveValidatorTest {
    @BeforeAll
    static void bootstrapMinecraftRegistries() {
        SharedConstants.tryDetectVersion();
        Bootstrap.bootStrap();
    }

    @Test
    void rejectsAStackThatIsNotTheExpectedNotebookItem() {
        assertThrows(IllegalArgumentException.class, () -> NotebookSaveValidator.validate(
                new ItemStack(Items.BOOK),
                Items.WRITABLE_BOOK,
                NotebookData.createDefault()));
    }

    @Test
    void rejectsAnEmptyHand() {
        assertThrows(IllegalArgumentException.class, () -> NotebookSaveValidator.validate(
                ItemStack.EMPTY,
                Items.WRITABLE_BOOK,
                NotebookData.createDefault()));
    }

    @Test
    void rejectsMalformedCoordinates() {
        NotebookData invalid = notebookWithPages(List.of(new NotebookPage(
                "page-1",
                "Page 1",
                List.of(new NotebookStroke(List.of(new NormalizedPoint(-0.01F, 0.5F)))))));

        assertThrows(IllegalArgumentException.class, () -> NotebookSaveValidator.validate(
                new ItemStack(Items.WRITABLE_BOOK),
                Items.WRITABLE_BOOK,
                invalid));
    }

    @Test
    void rejectsTooManyPagesBeforeUpdatingTheHeldStack() {
        List<NotebookPage> pages = IntStream.rangeClosed(1, NotebookLimits.MAX_PAGES + 1)
                .mapToObj(index -> NotebookPage.blank("page-" + index, "Page " + index))
                .toList();

        assertThrows(IllegalArgumentException.class, () -> NotebookSaveValidator.validate(
                new ItemStack(Items.WRITABLE_BOOK),
                Items.WRITABLE_BOOK,
                notebookWithPages(pages)));
    }

    @Test
    void returnsValidatedDataForTheHeldNotebook() {
        NotebookData data = NotebookData.createDefault().addPage();

        assertEquals(data, NotebookSaveValidator.validate(
                new ItemStack(Items.WRITABLE_BOOK),
                Items.WRITABLE_BOOK,
                data));
    }

    private static NotebookData notebookWithPages(List<NotebookPage> pages) {
        return new NotebookData(NotebookData.CURRENT_FORMAT, pages.getFirst().id(), pages);
    }
}
