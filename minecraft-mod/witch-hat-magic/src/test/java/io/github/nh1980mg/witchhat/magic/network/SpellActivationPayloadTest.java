package io.github.nh1980mg.witchhat.magic.network;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import io.netty.buffer.Unpooled;
import java.util.List;
import net.minecraft.core.RegistryAccess;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.world.InteractionHand;
import org.junit.jupiter.api.Test;

final class SpellActivationPayloadTest {
    @Test
    void roundTripsAnActivationRequest() {
        ActivateSpellPayload payload = new ActivateSpellPayload(
                InteractionHand.OFF_HAND, "page-12");

        assertEquals(payload, roundTrip(payload));
    }

    @Test
    void roundTripsAServerComputedActivationResult() {
        SpellActivationResultPayload payload = new SpellActivationResultPayload(
                InteractionHand.MAIN_HAND,
                "page-2",
                ActivationStatus.SUCCESS,
                List.of("eau"),
                List.of("orbe", "projectile"),
                1.25,
                0.9,
                276);

        assertEquals(payload, roundTrip(payload));
    }

    @Test
    void rejectsAnOversizedPageIdentifier() {
        ActivateSpellPayload payload = new ActivateSpellPayload(
                InteractionHand.MAIN_HAND,
                "x".repeat(NotebookPage.MAX_ID_LENGTH + 1));
        RegistryFriendlyByteBuf buffer = buffer();

        assertThrows(RuntimeException.class, () -> ActivateSpellPayload.CODEC.encode(buffer, payload));
    }

    private static ActivateSpellPayload roundTrip(ActivateSpellPayload payload) {
        RegistryFriendlyByteBuf buffer = buffer();
        ActivateSpellPayload.CODEC.encode(buffer, payload);
        buffer.readerIndex(0);
        return ActivateSpellPayload.CODEC.decode(buffer);
    }

    private static SpellActivationResultPayload roundTrip(
            SpellActivationResultPayload payload) {
        RegistryFriendlyByteBuf buffer = buffer();
        SpellActivationResultPayload.CODEC.encode(buffer, payload);
        buffer.readerIndex(0);
        return SpellActivationResultPayload.CODEC.decode(buffer);
    }

    private static RegistryFriendlyByteBuf buffer() {
        return new RegistryFriendlyByteBuf(Unpooled.buffer(), RegistryAccess.EMPTY);
    }
}
