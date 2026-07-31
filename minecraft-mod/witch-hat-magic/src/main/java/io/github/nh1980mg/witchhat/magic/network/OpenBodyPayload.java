package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.body.BodyPart;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import java.util.EnumMap;
import java.util.Map;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

public record OpenBodyPayload(Map<BodyPart, NotebookPage> tattoos)
        implements CustomPacketPayload {
    public static final Type<OpenBodyPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "open_body_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, OpenBodyPayload> CODEC =
            StreamCodec.ofMember(OpenBodyPayload::write, OpenBodyPayload::read);

    public OpenBodyPayload {
        tattoos = Map.copyOf(tattoos);
    }

    @Override
    public Type<OpenBodyPayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeVarInt(tattoos.size());
        tattoos.forEach((part, page) -> {
            buffer.writeVarInt(part.ordinal());
            NotebookPage.STREAM_CODEC.encode(buffer, page);
        });
    }

    private static OpenBodyPayload read(RegistryFriendlyByteBuf buffer) {
        int count = buffer.readVarInt();
        if (count < 0 || count > BodyPart.values().length) {
            throw new io.netty.handler.codec.DecoderException("Invalid tattoo count: " + count);
        }
        Map<BodyPart, NotebookPage> tattoos = new EnumMap<>(BodyPart.class);
        for (int index = 0; index < count; index++) {
            BodyPart part = BodyPart.values()[buffer.readVarInt()];
            tattoos.put(part, NotebookPage.STREAM_CODEC.decode(buffer));
        }
        return new OpenBodyPayload(tattoos);
    }
}
