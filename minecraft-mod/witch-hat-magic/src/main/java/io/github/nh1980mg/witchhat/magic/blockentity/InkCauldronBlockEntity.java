package io.github.nh1980mg.witchhat.magic.blockentity;

import io.github.nh1980mg.witchhat.magic.block.InkCauldronBlock;
import io.github.nh1980mg.witchhat.magic.registry.MagicBlockEntities;
import net.minecraft.core.BlockPos;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;

public class InkCauldronBlockEntity extends BlockEntity {
    private static final String BREW_TAG = "brew_ticks";
    private int brewTicks;

    public InkCauldronBlockEntity(BlockPos pos, BlockState state) {
        super(MagicBlockEntities.INK_CAULDRON, pos, state);
    }

    public void startBrewing(int ticks) {
        brewTicks = Math.max(1, ticks);
        setChanged();
    }

    /** fire 40s, campfire 25s, lava 12s — hotter is faster. */
    public static int brewTicksForHeat(int heat) {
        return switch (heat) {
            case 3 -> 240;
            case 2 -> 500;
            default -> 800;
        };
    }

    public static void tick(
            Level level,
            BlockPos pos,
            BlockState state,
            InkCauldronBlockEntity cauldron) {
        if (state.getValue(InkCauldronBlock.LEVEL) != 2 || cauldron.brewTicks <= 0) {
            return;
        }
        cauldron.brewTicks--;
        if (cauldron.brewTicks % 20 == 0) {
            cauldron.setChanged();
        }
        if (cauldron.brewTicks <= 0) {
            level.setBlock(pos, state.setValue(InkCauldronBlock.LEVEL, 3), Block.UPDATE_ALL);
        }
    }

    @Override
    protected void saveAdditional(CompoundTag tag, HolderLookup.Provider registries) {
        super.saveAdditional(tag, registries);
        tag.putInt(BREW_TAG, brewTicks);
    }

    @Override
    protected void loadAdditional(CompoundTag tag, HolderLookup.Provider registries) {
        super.loadAdditional(tag, registries);
        brewTicks = tag.getInt(BREW_TAG);
    }
}
