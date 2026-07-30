package io.github.nh1980mg.witchhat.magic.network;

import net.minecraft.server.level.ServerPlayer;

/** Shared 20-tick activation cooldown across notebook and canvas activations. */
public final class ActivationRateLimits {
    private static final ActivationRateLimiter<ServerPlayer> LIMITER = new ActivationRateLimiter<>(20);

    private ActivationRateLimits() {
    }

    public static boolean tryAcquire(ServerPlayer player) {
        return LIMITER.tryAcquire(player, player.tickCount);
    }
}
