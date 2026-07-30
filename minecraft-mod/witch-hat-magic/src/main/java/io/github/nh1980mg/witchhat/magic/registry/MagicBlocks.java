package io.github.nh1980mg.witchhat.magic.registry;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.block.CanvasBlock;
import io.github.nh1980mg.witchhat.magic.block.LargeCanvasBlock;
import io.github.nh1980mg.witchhat.magic.block.LargeCanvasPartBlock;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockBehaviour;

public final class MagicBlocks {
    public static final CanvasBlock CANVAS_SQUARE = Registry.register(
            BuiltInRegistries.BLOCK,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "canvas_square"),
            new CanvasBlock(BlockBehaviour.Properties.ofFullCopy(Blocks.OAK_PLANKS).noOcclusion()));

    public static final LargeCanvasBlock LARGE_CANVAS = Registry.register(
            BuiltInRegistries.BLOCK,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "large_canvas"),
            new LargeCanvasBlock(BlockBehaviour.Properties.ofFullCopy(Blocks.OAK_PLANKS).noOcclusion()));

    public static final LargeCanvasPartBlock LARGE_CANVAS_PART = Registry.register(
            BuiltInRegistries.BLOCK,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "large_canvas_part"),
            new LargeCanvasPartBlock(BlockBehaviour.Properties.ofFullCopy(Blocks.OAK_PLANKS).noOcclusion()));

    private MagicBlocks() {
    }

    public static void register() {
        // Loading this class performs the registry insertions.
    }
}
