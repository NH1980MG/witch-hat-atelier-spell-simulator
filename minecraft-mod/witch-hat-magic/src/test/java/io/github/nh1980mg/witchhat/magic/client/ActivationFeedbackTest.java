package io.github.nh1980mg.witchhat.magic.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.nh1980mg.witchhat.magic.network.SpellActivationResultPayload;
import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import io.github.nh1980mg.witchhat.magic.spell.RecognitionStatus;
import java.util.List;
import net.minecraft.world.InteractionHand;
import org.junit.jupiter.api.Test;

final class ActivationFeedbackTest {
    @Test
    void mapsEveryRecognitionStatusToALocalizedKey() {
        assertEquals(
                "screen.witch_hat_magic.recognition.empty",
                ActivationFeedback.recognitionKey(RecognitionStatus.EMPTY));
        assertEquals(
                "screen.witch_hat_magic.recognition.missing_sigil",
                ActivationFeedback.recognitionKey(RecognitionStatus.MISSING_SIGIL));
        assertEquals(
                "screen.witch_hat_magic.recognition.ready",
                ActivationFeedback.recognitionKey(RecognitionStatus.READY));
    }

    @Test
    void mapsEveryServerResultToALocalizedKey() {
        for (ActivationStatus status : ActivationStatus.values()) {
            assertEquals(
                    "screen.witch_hat_magic.activation." + status.name().toLowerCase(),
                    ActivationFeedback.activationKey(status));
        }
    }

    @Test
    void localizesSuccessfulSigilNamesWithoutAnOpenNotebookScreen() {
        assertEquals(
                "Water + Fire",
                ActivationFeedback.localizedSigils(List.of("eau", "feu"), false));
        assertEquals(
                "Eau + Feu",
                ActivationFeedback.localizedSigils(List.of("eau", "feu"), true));
    }

    @Test
    void closesOnlyTheMatchingNotebookPageAfterSuccess() {
        SpellActivationResultPayload success = new SpellActivationResultPayload(
                InteractionHand.MAIN_HAND,
                "page-1",
                ActivationStatus.SUCCESS,
                List.of("eau"),
                List.of(),
                1.0,
                0.95,
                288);
        SpellActivationResultPayload failure = new SpellActivationResultPayload(
                InteractionHand.MAIN_HAND,
                "page-1",
                ActivationStatus.MISSING_SIGIL,
                List.of(),
                List.of(),
                0.0,
                0.0,
                0);

        assertTrue(ActivationFeedback.shouldClose(
                success, InteractionHand.MAIN_HAND, "page-1", "page-1"));
        assertFalse(ActivationFeedback.shouldClose(
                success, InteractionHand.OFF_HAND, "page-1", "page-1"));
        assertFalse(ActivationFeedback.shouldClose(
                success, InteractionHand.MAIN_HAND, null, "page-1"));
        assertFalse(ActivationFeedback.shouldClose(
                success, InteractionHand.MAIN_HAND, "page-1", "page-2"));
        assertFalse(ActivationFeedback.shouldClose(
                failure, InteractionHand.MAIN_HAND, "page-1", "page-1"));
    }
}
