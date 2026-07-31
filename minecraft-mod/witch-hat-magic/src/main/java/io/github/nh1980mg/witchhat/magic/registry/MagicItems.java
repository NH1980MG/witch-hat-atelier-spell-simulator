package io.github.nh1980mg.witchhat.magic.registry;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.item.MagicCircleNotebookItem;
import io.github.nh1980mg.witchhat.magic.item.MagicCirclePageItem;
import io.github.nh1980mg.witchhat.magic.item.SylphShoesItem;
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

    public static final BlockItem LARGE_CANVAS = Registry.register(
            BuiltInRegistries.ITEM,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "large_canvas"),
            new BlockItem(MagicBlocks.LARGE_CANVAS, new Item.Properties().stacksTo(8)));

    public static final SylphShoesItem SYLPH_SHOES = Registry.register(
            BuiltInRegistries.ITEM,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "sylph_shoes"),
            new SylphShoesItem(new Item.Properties()
                    .stacksTo(1)
                    .durability(65)));

    public static final MagicCirclePageItem MAGIC_CIRCLE_PAGE = Registry.register(
            BuiltInRegistries.ITEM,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "magic_circle_page"),
            new MagicCirclePageItem(new Item.Properties().stacksTo(16)));

    public static final BlockItem INKWOOD_LOG = registerBlockItem("inkwood_log", MagicBlocks.INKWOOD_LOG, 64);
    public static final BlockItem INKWOOD_LEAVES = registerBlockItem("inkwood_leaves", MagicBlocks.INKWOOD_LEAVES, 64);
    public static final BlockItem INKWOOD_SAPLING = registerBlockItem("inkwood_sapling", MagicBlocks.INKWOOD_SAPLING, 64);
    public static final BlockItem INK_CAULDRON = registerBlockItem("ink_cauldron", MagicBlocks.INK_CAULDRON, 16);

    public static final Item INK_POD = Registry.register(
            BuiltInRegistries.ITEM,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "ink_pod"),
            new Item(new Item.Properties()));

    public static final Item MAGIC_INK = Registry.register(
            BuiltInRegistries.ITEM,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "magic_ink"),
            new Item(new Item.Properties().stacksTo(16)));

    private static BlockItem registerBlockItem(String name, net.minecraft.world.level.block.Block block, int stackSize) {
        return Registry.register(
                BuiltInRegistries.ITEM,
                ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, name),
                new BlockItem(block, new Item.Properties().stacksTo(stackSize)));
    }

    private MagicItems() {
    }

    public static void register() {
        ItemGroupEvents.modifyEntriesEvent(FUNCTIONAL_BLOCKS)
                .register(entries -> {
                    entries.accept(MAGIC_CIRCLE_NOTEBOOK);
                    entries.accept(CANVAS_SQUARE);
                    entries.accept(LARGE_CANVAS);
                    entries.accept(SYLPH_SHOES);
                    entries.accept(MAGIC_CIRCLE_PAGE);
                    entries.accept(INKWOOD_LOG);
                    entries.accept(INKWOOD_LEAVES);
                    entries.accept(INKWOOD_SAPLING);
                    entries.accept(INK_CAULDRON);
                    entries.accept(INK_POD);
                    entries.accept(MAGIC_INK);
                });
    }

    public static ItemStack createNotebookStack() {
        return MagicCircleNotebookItem.createDefaultStack(
                MAGIC_CIRCLE_NOTEBOOK, MagicComponents.NOTEBOOK_DATA);
    }
}
