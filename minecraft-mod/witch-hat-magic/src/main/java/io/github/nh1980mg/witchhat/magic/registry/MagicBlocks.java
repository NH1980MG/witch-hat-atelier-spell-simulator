package io.github.nh1980mg.witchhat.magic.registry;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.block.CanvasBlock;
import io.github.nh1980mg.witchhat.magic.block.InkCauldronBlock;
import io.github.nh1980mg.witchhat.magic.block.LargeCanvasBlock;
import io.github.nh1980mg.witchhat.magic.block.LargeCanvasPartBlock;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.LeavesBlock;
import net.minecraft.world.level.block.RotatedPillarBlock;
import net.minecraft.world.level.block.SaplingBlock;
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

    public static final RotatedPillarBlock INKWOOD_LOG = Registry.register(
            BuiltInRegistries.BLOCK,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "inkwood_log"),
            new RotatedPillarBlock(BlockBehaviour.Properties.ofFullCopy(Blocks.OAK_LOG)));

    public static final LeavesBlock INKWOOD_LEAVES = Registry.register(
            BuiltInRegistries.BLOCK,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "inkwood_leaves"),
            new LeavesBlock(BlockBehaviour.Properties.ofFullCopy(Blocks.OAK_LEAVES)));

    public static final SaplingBlock INKWOOD_SAPLING = Registry.register(
            BuiltInRegistries.BLOCK,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "inkwood_sapling"),
            new SaplingBlock(
                    MagicTreeGrowers.INKWOOD,
                    BlockBehaviour.Properties.ofFullCopy(Blocks.OAK_SAPLING)));

    public static final InkCauldronBlock INK_CAULDRON = Registry.register(
            BuiltInRegistries.BLOCK,
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "ink_cauldron"),
            new InkCauldronBlock(BlockBehaviour.Properties.ofFullCopy(Blocks.CAULDRON).noOcclusion()));

    private MagicBlocks() {
    }

    public static void register() {
        // Loading this class performs the registry insertions.
    }
}
