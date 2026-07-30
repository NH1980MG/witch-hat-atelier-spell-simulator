package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import io.github.nh1980mg.witchhat.magic.spell.RecognitionStatus;
import io.github.nh1980mg.witchhat.magic.symbol.MagicSymbolCatalog;
import java.util.List;
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

    static String localizedSigils(List<String> sigilIds, boolean french) {
        return sigilIds.stream()
                .map(id -> MagicSymbolCatalog.entries().stream()
                        .filter(entry -> entry.id().equals(id))
                        .findFirst()
                        .map(entry -> french ? entry.frenchName() : entry.englishName())
                        .orElse(id))
                .reduce((left, right) -> left + " + " + right)
                .orElse("");
    }
}
