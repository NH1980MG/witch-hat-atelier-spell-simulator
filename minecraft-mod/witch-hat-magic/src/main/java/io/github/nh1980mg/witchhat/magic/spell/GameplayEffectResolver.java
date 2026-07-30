package io.github.nh1980mg.witchhat.magic.spell;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Maps a recognized spell (sigils + signs) to Minecraft gameplay effects,
 * scaled by power (amplifier tier) and precision (duration via the spell's
 * own duration). Headline combo from the season finale: scaled wolf +
 * concealment weaves the cape that deceives appearances (invisibility).
 */
public final class GameplayEffectResolver {
    private static final Map<String, String> SIGIL_EFFECTS = Map.of(
            "feu", "minecraft:fire_resistance",
            "eau", "minecraft:water_breathing",
            "terre", "minecraft:resistance",
            "vent", "minecraft:speed",
            "lumiere", "minecraft:night_vision",
            "aeriforme", "minecraft:jump_boost");

    private static final double TIER_TWO_POWER = 1.5;
    private static final int MAX_LEVITATION_TICKS = 80; // 4s — floating is dangerous
    private static final double DISGUISE_DURATION_BONUS = 1.5;

    private GameplayEffectResolver() {}

    public static List<GameplayEffect> resolve(ActivationResult activation) {
        Objects.requireNonNull(activation, "activation");
        if (activation.status() != ActivationStatus.SUCCESS) {
            return List.of();
        }
        List<String> sigils = normalized(activation.sigilIds());
        List<String> signs = normalized(activation.signIds());
        int amplifier = activation.power() >= TIER_TWO_POWER ? 1 : 0;
        int duration = activation.durationTicks();

        List<GameplayEffect> effects = new ArrayList<>();
        for (String sigil : sigils) {
            String effectId = SIGIL_EFFECTS.get(sigil);
            if (effectId != null) {
                effects.add(GameplayEffect.apply(effectId, duration, amplifier));
            }
        }

        boolean disguise = sigils.contains("loup-ecaille") && signs.contains("dissimulation");
        if (disguise) {
            // The season-finale cloak: wolf scales woven with concealment.
            effects.add(GameplayEffect.apply(
                    "minecraft:invisibility",
                    (int) Math.round(duration * DISGUISE_DURATION_BONUS),
                    0));
        } else if (signs.contains("dissimulation")) {
            effects.add(GameplayEffect.apply(
                    "minecraft:invisibility", duration / 2, 0));
        }
        if (sigils.contains("vent_sous_pied")) {
            // Underfoot wind lifts the wearer — only usable with sylph shoes.
            effects.add(GameplayEffect.grantFlight(duration));
        }
        if (signs.contains("levitation")) {
            effects.add(GameplayEffect.apply(
                    "minecraft:levitation",
                    Math.min(duration, MAX_LEVITATION_TICKS),
                    0));
        }
        if (signs.contains("flottement")) {
            effects.add(GameplayEffect.apply("minecraft:slow_falling", duration, amplifier));
        }
        if (signs.contains("renforcement")) {
            effects.add(GameplayEffect.apply("minecraft:strength", duration, amplifier));
        }
        if (signs.contains("purification")) {
            effects.add(GameplayEffect.clearHarmful());
        }
        if (signs.contains("refroidissement")) {
            effects.add(GameplayEffect.extinguishFire());
        }
        return List.copyOf(effects);
    }

    private static List<String> normalized(List<String> ids) {
        return ids.stream().map(id -> id.toLowerCase(Locale.ROOT)).toList();
    }
}
