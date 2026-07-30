package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.InteractionHand;

public record ExtractPagePayload(InteractionHand hand, String pageId)
        implements CustomPacketPayload {
    public static final Type<ExtractPagePayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "extract_page_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, ExtractPagePayload> CODEC =
            StreamCodec.ofMember(ExtractPagePayload::write, ExtractPagePayload::read);

    @Override
    public Type<ExtractPagePayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeBoolean(hand == InteractionHand.MAIN_HAND);
        buffer.writeUtf(pageId, NotebookPage.MAX_ID_LENGTH);
    }

    private static ExtractPagePayload read(RegistryFriendlyByteBuf buffer) {
        return new ExtractPagePayload(
                buffer.readBoolean() ? InteractionHand.MAIN_HAND : InteractionHand.OFF_HAND,
                buffer.readUtf(NotebookPage.MAX_ID_LENGTH));
    }
}
