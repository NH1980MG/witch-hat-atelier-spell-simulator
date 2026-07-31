package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.body.BodyPart;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

public record ActivateTattooPayload(BodyPart part, String pageId)
        implements CustomPacketPayload {
    public static final Type<ActivateTattooPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "activate_tattoo_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, ActivateTattooPayload> CODEC =
            StreamCodec.ofMember(ActivateTattooPayload::write, ActivateTattooPayload::read);

    @Override
    public Type<ActivateTattooPayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeVarInt(part.ordinal());
        buffer.writeUtf(pageId, NotebookPage.MAX_ID_LENGTH);
    }

    private static ActivateTattooPayload read(RegistryFriendlyByteBuf buffer) {
        return new ActivateTattooPayload(
                BodyPart.values()[buffer.readVarInt()],
                buffer.readUtf(NotebookPage.MAX_ID_LENGTH));
    }
}
