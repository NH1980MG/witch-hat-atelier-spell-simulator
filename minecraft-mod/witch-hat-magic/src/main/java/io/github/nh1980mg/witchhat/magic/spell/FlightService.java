package io.github.nh1980mg.witchhat.magic.spell;

import java.util.Iterator;
import java.util.Map;
import java.util.Objects;
import java.util.WeakHashMap;
import net.minecraft.server.level.ServerPlayer;

/**
 * Temporary flight granted by the underfoot-wind sigil inscribed on sylph
 * shoes. Grants creative-style flight until the spell's duration expires,
 * then lands the wearer gently with a short slow-fall. Creative and
 * spectator players are never touched.
 */
public final class FlightService {
    private static final FlightService INSTANCE = new FlightService();
    private static final int LANDING_SLOW_FALL_TICKS = 100;

    private final Map<ServerPlayer, Long> flightUntilTick = new WeakHashMap<>();

    private FlightService() {}

    public static FlightService instance() {
        return INSTANCE;
    }

    public static int landingSlowFallTicks() {
        return LANDING_SLOW_FALL_TICKS;
    }

    public void grant(ServerPlayer player, int durationTicks) {
        Objects.requireNonNull(player, "player");
        if (durationTicks <= 0) {
            return;
        }
        flightUntilTick.put(player, player.tickCount + (long) durationTicks);
        if (!player.getAbilities().mayfly) {
            player.getAbilities().mayfly = true;
            player.onUpdateAbilities();
        }
    }

    public void revoke(ServerPlayer player) {
        flightUntilTick.remove(player);
        if (!player.isCreative() && !player.isSpectator() && player.getAbilities().mayfly) {
            player.getAbilities().mayfly = false;
            player.getAbilities().flying = false;
            player.onUpdateAbilities();
        }
    }

    public void tick() {
        Iterator<Map.Entry<ServerPlayer, Long>> iterator = flightUntilTick.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<ServerPlayer, Long> entry = iterator.next();
            ServerPlayer player = entry.getKey();
            if (player.isRemoved()) {
                iterator.remove();
                continue;
            }
            if (player.tickCount >= entry.getValue()) {
                iterator.remove();
                if (!player.isCreative() && !player.isSpectator() && player.getAbilities().mayfly) {
                    player.getAbilities().mayfly = false;
                    player.getAbilities().flying = false;
                    player.onUpdateAbilities();
                    GameplayEffectService.applySimple(
                            player, "minecraft:slow_falling", LANDING_SLOW_FALL_TICKS, 0);
                }
            }
        }
    }
}
