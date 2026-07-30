package io.github.nh1980mg.witchhat.magic.spell;

import java.util.Objects;

/**
 * One gameplay consequence of an activated spell: apply a status effect,
 * cleanse harmful effects, or douse fire. Ids are Minecraft mob-effect ids
 * (e.g. "minecraft:invisibility") resolved server-side.
 */
public record GameplayEffect(Kind kind, String effectId, int durationTicks, int amplifier) {
    public enum Kind {
        APPLY,
        CLEAR_HARMFUL,
        EXTINGUISH_FIRE
    }

    public GameplayEffect {
        kind = Objects.requireNonNull(kind, "kind");
        if (kind == Kind.APPLY) {
            Objects.requireNonNull(effectId, "effectId");
            if (durationTicks <= 0) {
                throw new IllegalArgumentException("Applied effects need a positive duration");
            }
            if (amplifier < 0) {
                throw new IllegalArgumentException("Amplifier cannot be negative");
            }
        }
    }

    public static GameplayEffect apply(String effectId, int durationTicks, int amplifier) {
        return new GameplayEffect(Kind.APPLY, effectId, durationTicks, amplifier);
    }

    public static GameplayEffect clearHarmful() {
        return new GameplayEffect(Kind.CLEAR_HARMFUL, null, 0, 0);
    }

    public static GameplayEffect extinguishFire() {
        return new GameplayEffect(Kind.EXTINGUISH_FIRE, null, 0, 0);
    }
}
