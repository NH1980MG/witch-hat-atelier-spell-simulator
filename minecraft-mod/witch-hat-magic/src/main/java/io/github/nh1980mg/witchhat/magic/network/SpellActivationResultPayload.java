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
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.InteractionHand;

public record SpellActivationResultPayload(
        InteractionHand hand,
        String pageId,
        ActivationStatus status,
        List<String> sigilIds,
        List<String> signIds)
        implements CustomPacketPayload {
    public static final Type<SpellActivationResultPayload> TYPE = new Type<>(
            ResourceLocation.fromNamespaceAndPath(
                    WitchHatMagicMod.MOD_ID, "spell_activation_result_v1"));
    public static final StreamCodec<RegistryFriendlyByteBuf, SpellActivationResultPayload> CODEC =
            StreamCodec.ofMember(
                    SpellActivationResultPayload::write,
                    SpellActivationResultPayload::read);

    public SpellActivationResultPayload {
        hand = Objects.requireNonNull(hand, "hand");
        pageId = Objects.requireNonNull(pageId, "pageId");
        status = Objects.requireNonNull(status, "status");
        sigilIds = boundedCopy(sigilIds);
        signIds = boundedCopy(signIds);
    }

    public static SpellActivationResultPayload from(
            InteractionHand hand,
            ActivationResult result) {
        return new SpellActivationResultPayload(
                hand,
                result.pageId(),
                result.status(),
                result.sigilIds(),
                result.signIds());
    }

    @Override
    public Type<SpellActivationResultPayload> type() {
        return TYPE;
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeBoolean(hand == InteractionHand.MAIN_HAND);
        buffer.writeUtf(pageId, NotebookPage.MAX_ID_LENGTH);
        buffer.writeVarInt(status.ordinal());
        writeIds(buffer, sigilIds);
        writeIds(buffer, signIds);
    }

    private static SpellActivationResultPayload read(RegistryFriendlyByteBuf buffer) {
        InteractionHand hand = buffer.readBoolean()
                ? InteractionHand.MAIN_HAND
                : InteractionHand.OFF_HAND;
        String pageId = buffer.readUtf(NotebookPage.MAX_ID_LENGTH);
        int statusOrdinal = buffer.readVarInt();
        if (statusOrdinal < 0 || statusOrdinal >= ActivationStatus.values().length) {
            throw new DecoderException("Invalid spell activation status");
        }
        return new SpellActivationResultPayload(
                hand,
                pageId,
                ActivationStatus.values()[statusOrdinal],
                readIds(buffer),
                readIds(buffer));
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
