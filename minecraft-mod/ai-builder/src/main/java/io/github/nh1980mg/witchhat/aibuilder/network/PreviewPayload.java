package io.github.nh1980mg.witchhat.aibuilder.network;

import io.github.nh1980mg.witchhat.aibuilder.AiBuilderMod;
import io.github.nh1980mg.witchhat.aibuilder.preview.PreviewPlacement;
import io.github.nh1980mg.witchhat.aibuilder.preview.PreviewStatus;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

public record PreviewPayload(
        String planId,
        String dimension,
        long expiresAt,
        List<PreviewPlacement> placements) implements CustomPacketPayload {
    public static final int MAX_PLACEMENTS = 50_000;
    public static final Type<PreviewPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(AiBuilderMod.MOD_ID, "preview_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, PreviewPayload> CODEC =
            StreamCodec.ofMember(PreviewPayload::write, PreviewPayload::read);

    public PreviewPayload {
        placements = List.copyOf(placements);
        if (placements.size() > MAX_PLACEMENTS) {
            throw new IllegalArgumentException("Preview payload is too large");
        }
    }

    @Override
    public Type<PreviewPayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeUtf(planId, 64);
        buffer.writeUtf(dimension, 128);
        buffer.writeLong(expiresAt);
        buffer.writeVarInt(placements.size());
        for (PreviewPlacement placement : placements) {
            buffer.writeVarInt(placement.x());
            buffer.writeVarInt(placement.y());
            buffer.writeVarInt(placement.z());
            buffer.writeByte(placement.status().ordinal());
        }
    }

    private static PreviewPayload read(RegistryFriendlyByteBuf buffer) {
        String planId = buffer.readUtf(64);
        String dimension = buffer.readUtf(128);
        long expiresAt = buffer.readLong();
        int count = buffer.readVarInt();
        if (count < 0 || count > MAX_PLACEMENTS) {
            throw new IllegalArgumentException("Invalid preview placement count: " + count);
        }
        List<PreviewPlacement> placements = new ArrayList<>(count);
        PreviewStatus[] statuses = PreviewStatus.values();
        for (int index = 0; index < count; index++) {
            int x = buffer.readVarInt();
            int y = buffer.readVarInt();
            int z = buffer.readVarInt();
            int status = buffer.readUnsignedByte();
            if (status >= statuses.length) {
                throw new IllegalArgumentException("Invalid preview status: " + status);
            }
            placements.add(new PreviewPlacement(x, y, z, statuses[status]));
        }
        return new PreviewPayload(planId, dimension, expiresAt, placements);
    }
}
