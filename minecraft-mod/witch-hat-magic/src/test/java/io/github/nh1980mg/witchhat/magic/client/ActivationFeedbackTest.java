package io.github.nh1980mg.witchhat.magic.client;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import io.github.nh1980mg.witchhat.magic.spell.RecognitionStatus;
import java.util.List;
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
}
