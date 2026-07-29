package io.github.nh1980mg.witchhat.magic.item;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import net.minecraft.SharedConstants;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.server.Bootstrap;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.ItemStack;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class MagicCircleNotebookItemTest {
    private static final DataComponentType<NotebookData> NOTEBOOK_DATA =
            DataComponentType.<NotebookData>builder()
                    .persistent(NotebookData.CODEC)
                    .networkSynchronized(NotebookData.STREAM_CODEC)
                    .build();

    @BeforeAll
    static void bootstrapMinecraftRegistries() {
        SharedConstants.tryDetectVersion();
        Bootstrap.bootStrap();
    }

    @Test
    void createsAStackWithOneBlankSelectedPage() {
        ItemStack stack = MagicCircleNotebookItem.createDefaultStack(Items.BOOK, NOTEBOOK_DATA);

        NotebookData data = stack.get(NOTEBOOK_DATA);
        assertNotNull(data);
        assertEquals(1, data.pages().size());
        assertEquals(data.pages().getFirst().id(), data.selectedPageId());
        assertEquals(0, data.selectedPage().strokes().size());
    }

    @Test
    void copiedStacksRetainIndependentImmutableNotebookData() {
        ItemStack original = MagicCircleNotebookItem.createDefaultStack(Items.BOOK, NOTEBOOK_DATA);
        ItemStack copy = original.copy();

        original.set(
                NOTEBOOK_DATA,
                original.getOrDefault(NOTEBOOK_DATA, NotebookData.createDefault()).addPage());

        assertEquals(2, original.get(NOTEBOOK_DATA).pages().size());
        assertEquals(1, copy.get(NOTEBOOK_DATA).pages().size());
    }
}
