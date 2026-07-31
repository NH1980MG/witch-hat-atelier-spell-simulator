package io.github.nh1980mg.witchhat.magic.registry;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.blockentity.CanvasBlockEntity;
import io.github.nh1980mg.witchhat.magic.blockentity.InkCauldronBlockEntity;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.level.block.entity.BlockEntityType;

public final class MagicBlockEntities {
    public static BlockEntityType<CanvasBlockEntity> CANVAS_BLOCK_ENTITY;
    public static BlockEntityType<InkCauldronBlockEntity> INK_CAULDRON;

    private MagicBlockEntities() {
    }

    public static void register() {
        CANVAS_BLOCK_ENTITY = Registry.register(
                BuiltInRegistries.BLOCK_ENTITY_TYPE,
                ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "canvas"),
                BlockEntityType.Builder.of(
                        CanvasBlockEntity::new,
                        MagicBlocks.CANVAS_SQUARE,
                        MagicBlocks.LARGE_CANVAS).build());
        INK_CAULDRON = Registry.register(
                BuiltInRegistries.BLOCK_ENTITY_TYPE,
                ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "ink_cauldron"),
                BlockEntityType.Builder.of(
                        InkCauldronBlockEntity::new, MagicBlocks.INK_CAULDRON).build());
    }
}
