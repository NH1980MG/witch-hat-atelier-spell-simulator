package io.github.nh1980mg.witchhat.magic.spell;

import java.util.List;
import java.util.Objects;

public record ActivationResult(
        ActivationStatus status,
        String pageId,
        List<String> sigilIds,
        List<String> signIds) {
    public ActivationResult {
        status = Objects.requireNonNull(status, "status");
        pageId = Objects.requireNonNull(pageId, "pageId");
        sigilIds = List.copyOf(Objects.requireNonNull(sigilIds, "sigilIds"));
        signIds = List.copyOf(Objects.requireNonNull(signIds, "signIds"));
    }

    public static ActivationResult failure(ActivationStatus status, String pageId) {
        return new ActivationResult(status, pageId, List.of(), List.of());
    }
}
