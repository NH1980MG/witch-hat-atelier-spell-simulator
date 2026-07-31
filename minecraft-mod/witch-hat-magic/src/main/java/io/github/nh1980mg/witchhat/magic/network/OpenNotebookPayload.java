package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.InteractionHand;

public record OpenNotebookPayload(InteractionHand hand, NotebookData data, boolean brotherhood)
        implements CustomPacketPayload {
    public static final Type<OpenNotebookPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "open_notebook_v2"));
    public static final StreamCodec<RegistryFriendlyByteBuf, OpenNotebookPayload> CODEC =
            StreamCodec.ofMember(OpenNotebookPayload::write, OpenNotebookPayload::read);

    @Override
    public Type<OpenNotebookPayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeBoolean(hand == InteractionHand.MAIN_HAND);
        NotebookData.STREAM_CODEC.encode(buffer, data);
        buffer.writeBoolean(brotherhood);
    }

    private static OpenNotebookPayload read(RegistryFriendlyByteBuf buffer) {
        InteractionHand hand = buffer.readBoolean()
                ? InteractionHand.MAIN_HAND
                : InteractionHand.OFF_HAND;
        return new OpenNotebookPayload(
                hand,
                NotebookData.STREAM_CODEC.decode(buffer),
                buffer.readBoolean());
    }
}
