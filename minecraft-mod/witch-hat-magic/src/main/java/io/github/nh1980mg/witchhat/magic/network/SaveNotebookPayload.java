package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.InteractionHand;

public record SaveNotebookPayload(InteractionHand hand, NotebookData data)
        implements CustomPacketPayload {
    public static final Type<SaveNotebookPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "save_notebook_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, SaveNotebookPayload> CODEC =
            StreamCodec.ofMember(SaveNotebookPayload::write, SaveNotebookPayload::read);

    @Override
    public Type<SaveNotebookPayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeBoolean(hand == InteractionHand.MAIN_HAND);
        NotebookData.STREAM_CODEC.encode(buffer, data);
    }

    private static SaveNotebookPayload read(RegistryFriendlyByteBuf buffer) {
        InteractionHand hand = buffer.readBoolean()
                ? InteractionHand.MAIN_HAND
                : InteractionHand.OFF_HAND;
        return new SaveNotebookPayload(hand, NotebookData.STREAM_CODEC.decode(buffer));
    }
}
