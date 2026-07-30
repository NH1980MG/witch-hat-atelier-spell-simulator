package io.github.nh1980mg.witchhat.magic.network;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import io.github.nh1980mg.witchhat.magic.spell.CircleSupport;
import java.util.List;
import net.minecraft.SharedConstants;
import net.minecraft.core.BlockPos;
import net.minecraft.core.RegistryAccess;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.server.Bootstrap;
import net.minecraft.world.InteractionHand;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

final class CanvasPayloadTest {
    @BeforeAll
    static void bootstrapMinecraftRegistries() {
        SharedConstants.tryDetectVersion();
        Bootstrap.bootStrap();
    }

    @Test
    void roundTripsTheOpenAndSyncPayloads() {
        OpenCanvasPayload open = new OpenCanvasPayload(
                new BlockPos(3, 64, -7), NotebookData.createDefault());
        assertEquals(open, roundTrip(open));

        SyncCanvasPayload sync = new SyncCanvasPayload(
                new BlockPos(-2, 70, 11), NotebookData.createDefault());
        assertEquals(sync, roundTrip(sync));
    }

    @Test
    void roundTripsTheSaveAndActivatePayloads() {
        SaveCanvasPayload save = new SaveCanvasPayload(
                new BlockPos(0, 65, 0), NotebookData.createDefault());
        assertEquals(save, roundTrip(save));

        ActivateCanvasPayload activate = new ActivateCanvasPayload(
                new BlockPos(8, 66, 8), "page-1");
        assertEquals(activate, roundTrip(activate));
    }

    @Test
    void roundTripsTheActivationResultWithMetricsAndDurability() {
        CanvasActivationResultPayload result = new CanvasActivationResultPayload(
                new BlockPos(1, 64, 2),
                "page-1",
                ActivationStatus.SUCCESS,
                List.of("feu"),
                List.of("orbe"),
                1.5,
                0.8,
                252,
                62);
        assertEquals(result, roundTrip(result));
    }

    private static OpenCanvasPayload roundTrip(OpenCanvasPayload payload) {
        RegistryFriendlyByteBuf buffer = buffer();
        OpenCanvasPayload.CODEC.encode(buffer, payload);
        buffer.readerIndex(0);
        return OpenCanvasPayload.CODEC.decode(buffer);
    }

    private static SyncCanvasPayload roundTrip(SyncCanvasPayload payload) {
        RegistryFriendlyByteBuf buffer = buffer();
        SyncCanvasPayload.CODEC.encode(buffer, payload);
        buffer.readerIndex(0);
        return SyncCanvasPayload.CODEC.decode(buffer);
    }

    private static SaveCanvasPayload roundTrip(SaveCanvasPayload payload) {
        RegistryFriendlyByteBuf buffer = buffer();
        SaveCanvasPayload.CODEC.encode(buffer, payload);
        buffer.readerIndex(0);
        return SaveCanvasPayload.CODEC.decode(buffer);
    }

    private static ActivateCanvasPayload roundTrip(ActivateCanvasPayload payload) {
        RegistryFriendlyByteBuf buffer = buffer();
        ActivateCanvasPayload.CODEC.encode(buffer, payload);
        buffer.readerIndex(0);
        return ActivateCanvasPayload.CODEC.decode(buffer);
    }

    private static CanvasActivationResultPayload roundTrip(CanvasActivationResultPayload payload) {
        RegistryFriendlyByteBuf buffer = buffer();
        CanvasActivationResultPayload.CODEC.encode(buffer, payload);
        buffer.readerIndex(0);
        return CanvasActivationResultPayload.CODEC.decode(buffer);
    }

    private static RegistryFriendlyByteBuf buffer() {
        return new RegistryFriendlyByteBuf(
                io.netty.buffer.Unpooled.buffer(), RegistryAccess.EMPTY);
    }
}
