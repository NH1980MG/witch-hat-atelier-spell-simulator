package io.github.nh1980mg.witchhat.magic.spell;

import java.util.List;
import java.util.Objects;

public record RecognizedSpell(
        RecognitionStatus status,
        List<String> sigilIds,
        List<String> signIds) {
    public RecognizedSpell {
        status = Objects.requireNonNull(status, "status");
        sigilIds = List.copyOf(Objects.requireNonNull(sigilIds, "sigilIds"));
        signIds = List.copyOf(Objects.requireNonNull(signIds, "signIds"));
    }

    public boolean activatable() {
        return status == RecognitionStatus.READY;
    }
}
