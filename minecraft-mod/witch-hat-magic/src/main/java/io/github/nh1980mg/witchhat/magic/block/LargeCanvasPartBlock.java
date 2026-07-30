package io.github.nh1980mg.witchhat.magic.block;

import com.mojang.serialization.MapCodec;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.DirectionProperty;
import net.minecraft.world.level.block.state.properties.IntegerProperty;

/**
 * Stateless filler cell of the 2x2 large canvas. FACING + PART_INDEX in the
 * blockstate locate the master cell; breaking a part breaks the master, and
 * a part whose master vanished self-destructs.
 */
public class LargeCanvasPartBlock extends Block {
    public static final MapCodec<LargeCanvasPartBlock> CODEC = simpleCodec(LargeCanvasPartBlock::new);
    public static final DirectionProperty FACING = BlockStateProperties.HORIZONTAL_FACING;
    public static final IntegerProperty PART_INDEX = IntegerProperty.create(
            "part_index", 0, CanvasMultiblock.PART_COUNT - 1);

    public LargeCanvasPartBlock(Properties properties) {
        super(properties);
        registerDefaultState(stateDefinition.any()
                .setValue(FACING, Direction.NORTH)
                .setValue(PART_INDEX, 0));
    }

    @Override
    protected MapCodec<? extends Block> codec() {
        return CODEC;
    }

    @Override
    protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
        builder.add(FACING, PART_INDEX);
    }

    private BlockPos masterPos(BlockState state, BlockPos pos) {
        return CanvasMultiblock.masterFromPart(
                pos, state.getValue(FACING), state.getValue(PART_INDEX));
    }

    @Override
    public BlockState playerWillDestroy(
            Level level,
            BlockPos pos,
            BlockState state,
            Player player) {
        if (!level.isClientSide()) {
            BlockPos master = masterPos(state, pos);
            if (level.getBlockState(master).getBlock() instanceof LargeCanvasBlock) {
                level.destroyBlock(master, !player.getAbilities().instabuild);
            }
        }
        return super.playerWillDestroy(level, pos, state, player);
    }

    @Override
    protected void neighborChanged(
            BlockState state,
            Level level,
            BlockPos pos,
            Block neighborBlock,
            BlockPos neighborPos,
            boolean movedByPiston) {
        super.neighborChanged(state, level, pos, neighborBlock, neighborPos, movedByPiston);
        if (!level.isClientSide()
                && !(level.getBlockState(masterPos(state, pos)).getBlock()
                        instanceof LargeCanvasBlock)) {
            level.destroyBlock(pos, false);
        }
    }
}
