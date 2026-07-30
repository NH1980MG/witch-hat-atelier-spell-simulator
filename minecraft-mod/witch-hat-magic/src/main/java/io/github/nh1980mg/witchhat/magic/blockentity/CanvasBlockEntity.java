package io.github.nh1980mg.witchhat.magic.blockentity;

import com.mojang.serialization.DataResult;
import io.github.nh1980mg.witchhat.magic.block.AbstractCanvasBlock;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.registry.MagicBlockEntities;
import io.github.nh1980mg.witchhat.magic.spell.CircleSupport;
import net.minecraft.core.BlockPos;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.NbtOps;
import net.minecraft.nbt.Tag;
import net.minecraft.network.protocol.game.ClientboundBlockEntityDataPacket;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;

public class CanvasBlockEntity extends BlockEntity {
    private static final String DRAWING_TAG = "drawing";
    private static final String REMAINING_TAG = "remaining_activations";

    private final CircleSupport support;
    private final int maxActivations;
    private NotebookData drawing = NotebookData.createDefault();
    private int remainingActivations;

    public CanvasBlockEntity(BlockPos pos, BlockState state) {
        super(MagicBlockEntities.CANVAS_BLOCK_ENTITY, pos, state);
        AbstractCanvasBlock block = (AbstractCanvasBlock) state.getBlock();
        this.support = block.support();
        this.maxActivations = block.maxActivations();
        this.remainingActivations = block.maxActivations();
    }

    public CircleSupport support() {
        return support;
    }

    public NotebookData drawing() {
        return drawing;
    }

    public void setDrawing(NotebookData data) {
        drawing = data;
        syncToClients();
    }

    public int remainingActivations() {
        return remainingActivations;
    }

    public int maxActivations() {
        return maxActivations;
    }

    public void consumeActivations(int cost) {
        remainingActivations = Math.max(0, remainingActivations - Math.max(0, cost));
        syncToClients();
    }

    public void repair() {
        remainingActivations = maxActivations;
        syncToClients();
    }

    public static int activationCost(double power) {
        return Math.max(1, (int) Math.ceil(power));
    }

    private void syncToClients() {
        setChanged();
        if (level != null && !level.isClientSide()) {
            level.sendBlockUpdated(worldPosition, getBlockState(), getBlockState(), Block.UPDATE_CLIENTS);
        }
    }

    @Override
    protected void saveAdditional(CompoundTag tag, HolderLookup.Provider registries) {
        super.saveAdditional(tag, registries);
        NotebookData.CODEC.encodeStart(NbtOps.INSTANCE, drawing)
                .result()
                .ifPresent(encoded -> tag.put(DRAWING_TAG, encoded));
        tag.putInt(REMAINING_TAG, remainingActivations);
    }

    @Override
    protected void loadAdditional(CompoundTag tag, HolderLookup.Provider registries) {
        super.loadAdditional(tag, registries);
        if (tag.contains(DRAWING_TAG)) {
            DataResult<NotebookData> decoded = NotebookData.CODEC.parse(
                    NbtOps.INSTANCE, tag.get(DRAWING_TAG));
            drawing = decoded.result().orElseGet(NotebookData::createDefault);
        }
        remainingActivations = tag.contains(REMAINING_TAG)
                ? Math.clamp(tag.getInt(REMAINING_TAG), 0, maxActivations)
                : maxActivations;
    }

    @Override
    public CompoundTag getUpdateTag(HolderLookup.Provider registries) {
        CompoundTag tag = super.getUpdateTag(registries);
        saveAdditional(tag, registries);
        return tag;
    }

    @Override
    public ClientboundBlockEntityDataPacket getUpdatePacket() {
        return ClientboundBlockEntityDataPacket.create(this);
    }
}
