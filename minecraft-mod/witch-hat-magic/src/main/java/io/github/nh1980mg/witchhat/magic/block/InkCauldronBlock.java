package io.github.nh1980mg.witchhat.magic.block;

import com.mojang.serialization.MapCodec;
import io.github.nh1980mg.witchhat.magic.blockentity.InkCauldronBlockEntity;
import io.github.nh1980mg.witchhat.magic.registry.MagicBlockEntities;
import io.github.nh1980mg.witchhat.magic.registry.MagicItems;
import net.minecraft.core.BlockPos;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.ItemInteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.BaseEntityBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.CampfireBlock;
import net.minecraft.world.level.block.RenderShape;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.BlockEntityTicker;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.IntegerProperty;
import net.minecraft.world.phys.BlockHitResult;

/**
 * Ink brewing cauldron: fill with a water bucket, drop an ink pod in, and
 * let an adjacent heat source boil it down — fire is slow, a campfire
 * faster, lava fastest. Bottle the result as magic ink.
 */
public class InkCauldronBlock extends BaseEntityBlock {
    public static final MapCodec<InkCauldronBlock> CODEC = simpleCodec(InkCauldronBlock::new);
    public static final IntegerProperty LEVEL = IntegerProperty.create("level", 0, 3);

    public InkCauldronBlock(Properties properties) {
        super(properties);
        registerDefaultState(stateDefinition.any().setValue(LEVEL, 0));
    }

    @Override
    protected MapCodec<? extends BaseEntityBlock> codec() {
        return CODEC;
    }

    @Override
    protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
        builder.add(LEVEL);
    }

    @Override
    protected RenderShape getRenderShape(BlockState state) {
        return RenderShape.MODEL;
    }

    @Override
    public BlockEntity newBlockEntity(BlockPos pos, BlockState state) {
        return new InkCauldronBlockEntity(pos, state);
    }

    @Override
    public <T extends BlockEntity> BlockEntityTicker<T> getTicker(
            Level level,
            BlockState state,
            BlockEntityType<T> type) {
        return level.isClientSide() || type != MagicBlockEntities.INK_CAULDRON
                ? null
                : (lvl, pos, blockState, blockEntity) ->
                        InkCauldronBlockEntity.tick(lvl, pos, blockState,
                                (InkCauldronBlockEntity) blockEntity);
    }

    public static int heatLevel(Level level, BlockPos pos) {
        int heat = 0;
        for (BlockPos neighbor : new BlockPos[]{
                pos.north(), pos.south(), pos.east(), pos.west(), pos.below()}) {
            BlockState state = level.getBlockState(neighbor);
            if (state.is(Blocks.LAVA)) {
                heat = Math.max(heat, 3);
            } else if (state.getBlock() instanceof CampfireBlock
                    && state.getValue(CampfireBlock.LIT)) {
                heat = Math.max(heat, 2);
            } else if (state.is(Blocks.FIRE) || state.is(Blocks.SOUL_FIRE)) {
                heat = Math.max(heat, 1);
            }
        }
        return heat;
    }

    @Override
    protected ItemInteractionResult useItemOn(
            ItemStack stack,
            BlockState state,
            Level level,
            BlockPos pos,
            Player player,
            InteractionHand hand,
            BlockHitResult hitResult) {
        int current = state.getValue(LEVEL);
        if (stack.is(Items.WATER_BUCKET) && current == 0) {
            if (!level.isClientSide()) {
                level.setBlock(pos, state.setValue(LEVEL, 1), Block.UPDATE_ALL);
                if (!player.getAbilities().instabuild) {
                    player.setItemInHand(hand, new ItemStack(Items.BUCKET));
                }
                level.playSound(null, pos, SoundEvents.BUCKET_EMPTY, SoundSource.BLOCKS, 1.0F, 1.0F);
            }
            return ItemInteractionResult.sidedSuccess(level.isClientSide());
        }
        if (stack.is(MagicItems.INK_POD) && current == 1) {
            int heat = heatLevel(level, pos);
            if (heat == 0) {
                return ItemInteractionResult.PASS_TO_DEFAULT_BLOCK_INTERACTION;
            }
            if (!level.isClientSide()) {
                level.setBlock(pos, state.setValue(LEVEL, 2), Block.UPDATE_ALL);
                BlockEntity blockEntity = level.getBlockEntity(pos);
                if (blockEntity instanceof InkCauldronBlockEntity cauldron) {
                    cauldron.startBrewing(InkCauldronBlockEntity.brewTicksForHeat(heat));
                }
                if (!player.getAbilities().instabuild) {
                    stack.shrink(1);
                }
                level.playSound(null, pos, SoundEvents.BREWING_STAND_BREW, SoundSource.BLOCKS, 1.0F, 1.0F);
            }
            return ItemInteractionResult.sidedSuccess(level.isClientSide());
        }
        if (stack.is(Items.GLASS_BOTTLE) && current == 3) {
            if (!level.isClientSide()) {
                level.setBlock(pos, state.setValue(LEVEL, 0), Block.UPDATE_ALL);
                if (!player.getAbilities().instabuild) {
                    stack.shrink(1);
                }
                ItemStack ink = new ItemStack(MagicItems.MAGIC_INK);
                if (!player.getInventory().add(ink)) {
                    player.drop(ink, false);
                }
                level.playSound(null, pos, SoundEvents.BOTTLE_FILL, SoundSource.BLOCKS, 1.0F, 1.0F);
            }
            return ItemInteractionResult.sidedSuccess(level.isClientSide());
        }
        return ItemInteractionResult.PASS_TO_DEFAULT_BLOCK_INTERACTION;
    }
}
