package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import java.util.Objects;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.InteractionHand;

public record ActivateSpellPayload(InteractionHand hand, String pageId)
        implements CustomPacketPayload {
    public static final Type<ActivateSpellPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "activate_spell_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, ActivateSpellPayload> CODEC =
            StreamCodec.ofMember(ActivateSpellPayload::write, ActivateSpellPayload::read);

    public ActivateSpellPayload {
        hand = Objects.requireNonNull(hand, "hand");
        pageId = Objects.requireNonNull(pageId, "pageId");
    }

    @Override
    public Type<ActivateSpellPayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeBoolean(hand == InteractionHand.MAIN_HAND);
        buffer.writeUtf(pageId, NotebookPage.MAX_ID_LENGTH);
    }

    private static ActivateSpellPayload read(RegistryFriendlyByteBuf buffer) {
        InteractionHand hand = buffer.readBoolean()
                ? InteractionHand.MAIN_HAND
                : InteractionHand.OFF_HAND;
        return new ActivateSpellPayload(
                hand, buffer.readUtf(NotebookPage.MAX_ID_LENGTH));
    }
}
