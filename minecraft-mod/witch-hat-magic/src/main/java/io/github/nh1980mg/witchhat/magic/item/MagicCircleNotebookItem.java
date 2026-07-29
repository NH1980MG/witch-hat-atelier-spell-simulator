package io.github.nh1980mg.witchhat.magic.item;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.ItemLike;

public final class MagicCircleNotebookItem extends Item {
    public MagicCircleNotebookItem(Properties properties) {
        super(properties);
    }

    public static ItemStack createDefaultStack(
            ItemLike item,
            DataComponentType<NotebookData> notebookDataComponent) {
        ItemStack stack = new ItemStack(item);
        stack.set(notebookDataComponent, NotebookData.createDefault());
        return stack;
    }
}
