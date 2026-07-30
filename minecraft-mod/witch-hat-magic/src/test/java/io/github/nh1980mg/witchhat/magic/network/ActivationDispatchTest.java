package io.github.nh1980mg.witchhat.magic.network;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.github.nh1980mg.witchhat.magic.spell.ActivationResult;
import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

final class ActivationDispatchTest {
    @Test
    void sendsTheResultBeforeManifestingSuccessfulActivations() {
        List<String> events = new ArrayList<>();
        ActivationResult result = new ActivationResult(
                ActivationStatus.SUCCESS,
                "page-1",
                List.of("eau"),
                List.of());

        ActivationDispatch.run(
                result,
                () -> events.add("result"),
                () -> events.add("manifestation"));

        assertEquals(List.of("result", "manifestation"), events);
    }

    @Test
    void neverManifestsFailedActivations() {
        List<String> events = new ArrayList<>();
        ActivationResult result = ActivationResult.failure(
                ActivationStatus.MISSING_SIGIL,
                "page-1");

        ActivationDispatch.run(
                result,
                () -> events.add("result"),
                () -> events.add("manifestation"));

        assertEquals(List.of("result"), events);
    }

    @Test
    void convertsRateLimitedSuccessIntoAnExplicitFailure() {
        ActivationResult success = new ActivationResult(
                ActivationStatus.SUCCESS,
                "page-1",
                List.of("eau"),
                List.of());

        ActivationResult limited = ActivationDispatch.applyRateLimit(success, false);

        assertEquals(ActivationStatus.COOLDOWN, limited.status());
        assertEquals("page-1", limited.pageId());
        assertEquals(List.of(), limited.sigilIds());
    }

    @Test
    void preservesSuccessfulOrAlreadyFailedResultsWhenRateLimitAllowsThem() {
        ActivationResult success = new ActivationResult(
                ActivationStatus.SUCCESS,
                "page-1",
                List.of("eau"),
                List.of());
        ActivationResult failure = ActivationResult.failure(
                ActivationStatus.MISSING_SIGIL,
                "page-1");

        assertEquals(success, ActivationDispatch.applyRateLimit(success, true));
        assertEquals(failure, ActivationDispatch.applyRateLimit(failure, false));
    }
}
