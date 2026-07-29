package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.InteractionHand;

public record SyncNotebookPayload(InteractionHand hand, NotebookData data)
        implements CustomPacketPayload {
    public static final Type<SyncNotebookPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "sync_notebook_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, SyncNotebookPayload> CODEC =
            StreamCodec.ofMember(SyncNotebookPayload::write, SyncNotebookPayload::read);

    @Override
    public Type<SyncNotebookPayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeBoolean(hand == InteractionHand.MAIN_HAND);
        NotebookData.STREAM_CODEC.encode(buffer, data);
    }

    private static SyncNotebookPayload read(RegistryFriendlyByteBuf buffer) {
        InteractionHand hand = buffer.readBoolean()
                ? InteractionHand.MAIN_HAND
                : InteractionHand.OFF_HAND;
        return new SyncNotebookPayload(hand, NotebookData.STREAM_CODEC.decode(buffer));
    }
}
