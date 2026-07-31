package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

public record OpenBodyRequestPayload() implements CustomPacketPayload {
    public static final Type<OpenBodyRequestPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "open_body_request_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, OpenBodyRequestPayload> CODEC =
            StreamCodec.ofMember(
                    (payload, buffer) -> { },
                    buffer -> new OpenBodyRequestPayload());

    @Override
    public Type<OpenBodyRequestPayload> type() {
        return TYPE;
    }
}
