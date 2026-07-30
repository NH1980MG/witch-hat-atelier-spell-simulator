package io.github.nh1980mg.witchhat.magic.network;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

final class ActivationRateLimiterTest {
    @Test
    void allowsOnlyOneActivationPerPlayerDuringTheCooldown() {
        ActivationRateLimiter<String> limiter = new ActivationRateLimiter<>(20);

        assertTrue(limiter.tryAcquire("player-a", 100));
        assertFalse(limiter.tryAcquire("player-a", 119));
        assertTrue(limiter.tryAcquire("player-a", 120));
    }

    @Test
    void tracksPlayersIndependently() {
        ActivationRateLimiter<String> limiter = new ActivationRateLimiter<>(20);

        assertTrue(limiter.tryAcquire("player-a", 100));
        assertTrue(limiter.tryAcquire("player-b", 100));
    }
}
