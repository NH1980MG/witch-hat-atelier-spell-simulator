package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.body.BodyPart;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

public record SaveTattooPayload(BodyPart part, NotebookPage page)
        implements CustomPacketPayload {
    public static final Type<SaveTattooPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "save_tattoo_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, SaveTattooPayload> CODEC =
            StreamCodec.ofMember(SaveTattooPayload::write, SaveTattooPayload::read);

    @Override
    public Type<SaveTattooPayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeVarInt(part.ordinal());
        NotebookPage.STREAM_CODEC.encode(buffer, page);
    }

    private static SaveTattooPayload read(RegistryFriendlyByteBuf buffer) {
        return new SaveTattooPayload(
                BodyPart.values()[buffer.readVarInt()],
                NotebookPage.STREAM_CODEC.decode(buffer));
    }
}
