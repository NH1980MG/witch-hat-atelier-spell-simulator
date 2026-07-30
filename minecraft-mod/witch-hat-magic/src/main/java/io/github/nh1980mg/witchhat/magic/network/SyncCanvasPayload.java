package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import net.minecraft.core.BlockPos;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

public record SyncCanvasPayload(BlockPos pos, NotebookData data)
        implements CustomPacketPayload {
    public static final Type<SyncCanvasPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "sync_canvas_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, SyncCanvasPayload> CODEC =
            StreamCodec.ofMember(SyncCanvasPayload::write, SyncCanvasPayload::read);

    @Override
    public Type<SyncCanvasPayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        BlockPos.STREAM_CODEC.encode(buffer, pos);
        NotebookData.STREAM_CODEC.encode(buffer, data);
    }

    private static SyncCanvasPayload read(RegistryFriendlyByteBuf buffer) {
        return new SyncCanvasPayload(
                BlockPos.STREAM_CODEC.decode(buffer),
                NotebookData.STREAM_CODEC.decode(buffer));
    }
}
