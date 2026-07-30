package io.github.nh1980mg.witchhat.magic.registry;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.item.MagicCircleNotebookItem;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import net.fabricmc.fabric.api.itemgroup.v1.ItemGroupEvents;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;

public final class MagicItems {
    private static final ResourceKey<CreativeModeTab> FUNCTIONAL_BLOCKS = ResourceKey.create(
            Registries.CREATIVE_MODE_TAB,
            ResourceLocation.withDefaultNamespace("functional_blocks"));

    public static final MagicCircleNotebookItem MAGIC_CIRCLE_NOTEBOOK = Registry.register(
            BuiltInRegistries.ITEM,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "magic_circle_notebook"),
            new MagicCircleNotebookItem(new Item.Properties()
                    .stacksTo(1)
                    .component(MagicComponents.NOTEBOOK_DATA, NotebookData.createDefault())));

    public static final BlockItem CANVAS_SQUARE = Registry.register(
            BuiltInRegistries.ITEM,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "canvas_square"),
            new BlockItem(MagicBlocks.CANVAS_SQUARE, new Item.Properties().stacksTo(16)));

    private MagicItems() {
    }

    public static void register() {
        ItemGroupEvents.modifyEntriesEvent(FUNCTIONAL_BLOCKS)
                .register(entries -> {
                    entries.accept(MAGIC_CIRCLE_NOTEBOOK);
                    entries.accept(CANVAS_SQUARE);
                });
    }

    public static ItemStack createNotebookStack() {
        return MagicCircleNotebookItem.createDefaultStack(
                MAGIC_CIRCLE_NOTEBOOK, MagicComponents.NOTEBOOK_DATA);
    }
}
