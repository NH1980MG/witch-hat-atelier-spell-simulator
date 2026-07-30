package io.github.nh1980mg.witchhat.magic.spell;

import java.util.List;
import java.util.Objects;

public record RecognizedSpell(
        RecognitionStatus status,
        List<String> sigilIds,
        List<String> signIds,
        double power,
        double precision,
        int durationTicks,
        double directionX,
        double directionY,
        double lift) {
    public RecognizedSpell {
        status = Objects.requireNonNull(status, "status");
        sigilIds = List.copyOf(Objects.requireNonNull(sigilIds, "sigilIds"));
        signIds = List.copyOf(Objects.requireNonNull(signIds, "signIds"));
    }

    public RecognizedSpell(RecognitionStatus status, List<String> sigilIds, List<String> signIds) {
        this(status, sigilIds, signIds, 0.0, 0.0, 0, 0.0, 0.0, 0.0);
    }

    public boolean activatable() {
        return status == RecognitionStatus.READY;
    }
}
