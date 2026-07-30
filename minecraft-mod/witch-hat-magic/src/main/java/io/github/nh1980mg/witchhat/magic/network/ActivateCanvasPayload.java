package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import net.minecraft.core.BlockPos;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

public record ActivateCanvasPayload(BlockPos pos, String pageId)
        implements CustomPacketPayload {
    public static final Type<ActivateCanvasPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "activate_canvas_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, ActivateCanvasPayload> CODEC =
            StreamCodec.ofMember(ActivateCanvasPayload::write, ActivateCanvasPayload::read);

    @Override
    public Type<ActivateCanvasPayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        BlockPos.STREAM_CODEC.encode(buffer, pos);
        buffer.writeUtf(pageId, NotebookPage.MAX_ID_LENGTH);
    }

    private static ActivateCanvasPayload read(RegistryFriendlyByteBuf buffer) {
        return new ActivateCanvasPayload(
                BlockPos.STREAM_CODEC.decode(buffer),
                buffer.readUtf(NotebookPage.MAX_ID_LENGTH));
    }
}
