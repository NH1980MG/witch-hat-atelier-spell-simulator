package io.github.nh1980mg.witchhat.magic.block;

import com.mojang.serialization.MapCodec;
import io.github.nh1980mg.witchhat.magic.registry.MagicBlocks;
import io.github.nh1980mg.witchhat.magic.spell.CircleSupport;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.BaseEntityBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;

public class LargeCanvasBlock extends AbstractCanvasBlock {
    public static final MapCodec<LargeCanvasBlock> CODEC = simpleCodec(LargeCanvasBlock::new);
    public static final int MAX_ACTIVATIONS = 128;

    public LargeCanvasBlock(Properties properties) {
        super(properties);
    }

    @Override
    public CircleSupport support() {
        return CircleSupport.LARGE_CANVAS;
    }

    @Override
    public int maxActivations() {
        return MAX_ACTIVATIONS;
    }

    @Override
    protected double shapeHeight() {
        return 5.0;
    }

    @Override
    protected MapCodec<? extends BaseEntityBlock> codec() {
        return CODEC;
    }

    @Override
    public Vec3 manifestationAnchor(BlockPos pos, Direction facing) {
        Direction right = facing.getClockWise();
        return Vec3.atCenterOf(pos)
                .add(right.getNormal().getX() * 0.5, 0.9, right.getNormal().getZ() * 0.5)
                .add(facing.getNormal().getX() * 0.5, 0.0, facing.getNormal().getZ() * 0.5)
                .add(Vec3.atLowerCornerOf(facing.getNormal()).scale(1.2));
    }

    @Override
    public BlockState getStateForPlacement(BlockPlaceContext context) {
        BlockState state = super.getStateForPlacement(context);
        if (state == null) {
            return null;
        }
        BlockPos master = context.getClickedPos();
        Direction facing = state.getValue(FACING);
        for (BlockPos part : CanvasMultiblock.partPositions(master, facing)) {
            if (!context.getLevel().getBlockState(part).canBeReplaced(context)) {
                return null;
            }
        }
        return state;
    }

    @Override
    public void setPlacedBy(
            Level level,
            BlockPos pos,
            BlockState state,
            LivingEntity placer,
            ItemStack stack) {
        super.setPlacedBy(level, pos, state, placer, stack);
        if (level.isClientSide()) {
            return;
        }
        Direction facing = state.getValue(FACING);
        int index = 0;
        for (BlockPos part : CanvasMultiblock.partPositions(pos, facing)) {
            level.setBlock(part, MagicBlocks.LARGE_CANVAS_PART.defaultBlockState()
                    .setValue(LargeCanvasPartBlock.FACING, facing)
                    .setValue(LargeCanvasPartBlock.PART_INDEX, index), Block.UPDATE_ALL);
            index++;
        }
    }

    @Override
    protected void onRemove(
            BlockState state,
            Level level,
            BlockPos pos,
            BlockState newState,
            boolean movedByPiston) {
        if (!state.is(newState.getBlock()) && !level.isClientSide()) {
            Direction facing = state.getValue(FACING);
            for (BlockPos part : CanvasMultiblock.partPositions(pos, facing)) {
                if (level.getBlockState(part).getBlock() instanceof LargeCanvasPartBlock) {
                    level.removeBlock(part, false);
                }
            }
        }
        super.onRemove(state, level, pos, newState, movedByPiston);
    }
}
