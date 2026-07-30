package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import io.github.nh1980mg.witchhat.magic.spell.RecognitionStatus;
import java.util.Locale;

final class ActivationFeedback {
    private ActivationFeedback() {}

    static String recognitionKey(RecognitionStatus status) {
        return "screen.witch_hat_magic.recognition."
                + status.name().toLowerCase(Locale.ROOT);
    }

    static String activationKey(ActivationStatus status) {
        return "screen.witch_hat_magic.activation."
                + status.name().toLowerCase(Locale.ROOT);
    }
}
