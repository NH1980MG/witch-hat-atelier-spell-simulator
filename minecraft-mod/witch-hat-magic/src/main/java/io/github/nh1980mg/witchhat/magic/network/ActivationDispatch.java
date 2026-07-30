package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.spell.ActivationResult;
import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import java.util.Objects;

final class ActivationDispatch {
    private ActivationDispatch() {}

    static void run(
            ActivationResult result,
            Runnable sendResult,
            Runnable manifest) {
        Objects.requireNonNull(result, "result");
        Objects.requireNonNull(sendResult, "sendResult").run();
        if (result.status() == ActivationStatus.SUCCESS) {
            Objects.requireNonNull(manifest, "manifest").run();
        }
    }

    static ActivationResult applyRateLimit(
            ActivationResult result,
            boolean manifestationAllowed) {
        Objects.requireNonNull(result, "result");
        if (result.status() != ActivationStatus.SUCCESS || manifestationAllowed) {
            return result;
        }
        return ActivationResult.failure(ActivationStatus.COOLDOWN, result.pageId());
    }
}
