package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookLimits;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.spell.ActivationResult;
import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import io.netty.handler.codec.DecoderException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import net.minecraft.core.BlockPos;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;

public record CanvasActivationResultPayload(
        BlockPos pos,
        String pageId,
        ActivationStatus status,
        List<String> sigilIds,
        List<String> signIds,
        double power,
        double precision,
        int durationTicks,
        int remainingActivations)
        implements CustomPacketPayload {
    public static final Type<CanvasActivationResultPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(
                    WitchHatMagicMod.MOD_ID, "canvas_activation_result_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, CanvasActivationResultPayload> CODEC =
            StreamCodec.ofMember(
                    CanvasActivationResultPayload::write,
                    CanvasActivationResultPayload::read);

    public CanvasActivationResultPayload {
        pos = Objects.requireNonNull(pos, "pos");
        pageId = Objects.requireNonNull(pageId, "pageId");
        status = Objects.requireNonNull(status, "status");
        sigilIds = boundedCopy(sigilIds);
        signIds = boundedCopy(signIds);
    }

    public static CanvasActivationResultPayload from(
            BlockPos pos,
            ActivationResult result,
            int remainingActivations) {
        return new CanvasActivationResultPayload(
                pos,
                result.pageId(),
                result.status(),
                result.sigilIds(),
                result.signIds(),
                result.power(),
                result.precision(),
                result.durationTicks(),
                remainingActivations);
    }

    @Override
    public Type<CanvasActivationResultPayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        BlockPos.STREAM_CODEC.encode(buffer, pos);
        buffer.writeUtf(pageId, NotebookPage.MAX_ID_LENGTH);
        buffer.writeVarInt(status.ordinal());
        writeIds(buffer, sigilIds);
        writeIds(buffer, signIds);
        buffer.writeDouble(power);
        buffer.writeDouble(precision);
        buffer.writeVarInt(durationTicks);
        buffer.writeVarInt(remainingActivations);
    }

    private static CanvasActivationResultPayload read(RegistryFriendlyByteBuf buffer) {
        BlockPos pos = BlockPos.STREAM_CODEC.decode(buffer);
        String pageId = buffer.readUtf(NotebookPage.MAX_ID_LENGTH);
        int statusOrdinal = buffer.readVarInt();
        if (statusOrdinal < 0 || statusOrdinal >= ActivationStatus.values().length) {
            throw new DecoderException("Invalid canvas activation status");
        }
        ActivationStatus status = ActivationStatus.values()[statusOrdinal];
        List<String> sigilIds = readIds(buffer);
        List<String> signIds = readIds(buffer);
        return new CanvasActivationResultPayload(
                pos,
                pageId,
                status,
                sigilIds,
                signIds,
                buffer.readDouble(),
                buffer.readDouble(),
                buffer.readVarInt(),
                buffer.readVarInt());
    }

    private static void writeIds(RegistryFriendlyByteBuf buffer, List<String> ids) {
        buffer.writeVarInt(ids.size());
        ids.forEach(id -> buffer.writeUtf(id, NotebookPage.MAX_ID_LENGTH));
    }

    private static List<String> readIds(RegistryFriendlyByteBuf buffer) {
        int count = buffer.readVarInt();
        if (count < 0 || count > NotebookLimits.MAX_SYMBOLS_PER_PAGE) {
            throw new DecoderException("Invalid recognized symbol count: " + count);
        }
        List<String> ids = new ArrayList<>(count);
        for (int index = 0; index < count; index++) {
            ids.add(buffer.readUtf(NotebookPage.MAX_ID_LENGTH));
        }
        return ids;
    }

    private static List<String> boundedCopy(List<String> ids) {
        List<String> copied = List.copyOf(Objects.requireNonNull(ids, "ids"));
        if (copied.size() > NotebookLimits.MAX_SYMBOLS_PER_PAGE) {
            throw new IllegalArgumentException("Too many recognized symbols");
        }
        copied.forEach(id -> {
            Objects.requireNonNull(id, "symbol id");
            if (id.length() > NotebookPage.MAX_ID_LENGTH) {
                throw new IllegalArgumentException("Recognized symbol id is too long");
            }
        });
        return copied;
    }
}
