package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookLimits;
import java.util.Objects;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;

public final class NotebookSaveValidator {
    private NotebookSaveValidator() {
    }

    public static NotebookData validate(
            ItemStack heldStack,
            Item expectedNotebookItem,
            NotebookData proposedData) {
        Objects.requireNonNull(heldStack, "heldStack");
        Objects.requireNonNull(expectedNotebookItem, "expectedNotebookItem");
        if (heldStack.isEmpty() || !heldStack.is(expectedNotebookItem)) {
            throw new IllegalArgumentException("The selected hand does not hold a magic notebook");
        }
        return NotebookLimits.validate(proposedData);
    }
}
