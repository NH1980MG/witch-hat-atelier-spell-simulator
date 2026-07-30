package io.github.nh1980mg.witchhat.magic.network;

import java.util.Map;
import java.util.Objects;
import java.util.WeakHashMap;

final class ActivationRateLimiter<K> {
    private final long cooldownTicks;
    private final Map<K, Long> nextAllowedTick = new WeakHashMap<>();

    ActivationRateLimiter(long cooldownTicks) {
        if (cooldownTicks <= 0) {
            throw new IllegalArgumentException("Cooldown must be positive");
        }
        this.cooldownTicks = cooldownTicks;
    }

    synchronized boolean tryAcquire(K key, long currentTick) {
        Objects.requireNonNull(key, "key");
        Long nextTick = nextAllowedTick.get(key);
        if (nextTick != null && currentTick < nextTick) {
            return false;
        }
        long allowedAgain = currentTick > Long.MAX_VALUE - cooldownTicks
                ? Long.MAX_VALUE
                : currentTick + cooldownTicks;
        nextAllowedTick.put(key, allowedAgain);
        return true;
    }
}
