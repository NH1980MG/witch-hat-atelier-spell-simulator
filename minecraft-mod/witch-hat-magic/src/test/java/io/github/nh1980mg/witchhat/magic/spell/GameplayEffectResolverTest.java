package io.github.nh1980mg.witchhat.magic.spell;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

final class GameplayEffectResolverTest {
    @Test
    void resolvesNothingForFailedActivations() {
        assertTrue(GameplayEffectResolver.resolve(
                ActivationResult.failure(ActivationStatus.MISSING_SIGIL, "page-1")).isEmpty());
    }

    @Test
    void mapsElementalSigilsToSurvivalEffects() {
        List<GameplayEffect> effects = GameplayEffectResolver.resolve(
                success(List.of("feu", "eau"), List.of(), 1.0, 200));

        List<String> applied = appliedIds(effects);
        assertTrue(applied.contains("minecraft:fire_resistance"));
        assertTrue(applied.contains("minecraft:water_breathing"));
    }

    @Test
    void theScaledWolfCapeGrantsFullInvisibility() {
        List<GameplayEffect> effects = GameplayEffectResolver.resolve(
                success(List.of("loup_ecaille"), List.of("dissimulation"), 1.0, 200));

        GameplayEffect cape = effects.stream()
                .filter(effect -> effect.effectId() != null
                        && effect.effectId().equals("minecraft:invisibility"))
                .findFirst()
                .orElseThrow();
        assertEquals(300, cape.durationTicks()); // 200 x 1.5 bonus
    }

    @Test
    void concealmentAloneGrantsWeakerInvisibility() {
        List<GameplayEffect> effects = GameplayEffectResolver.resolve(
                success(List.of("eau"), List.of("dissimulation"), 1.0, 200));

        GameplayEffect effect = effects.stream()
                .filter(candidate -> candidate.effectId() != null
                        && candidate.effectId().equals("minecraft:invisibility"))
                .findFirst()
                .orElseThrow();
        assertEquals(100, effect.durationTicks());
    }

    @Test
    void levitationIsCappedForSafety() {
        List<GameplayEffect> effects = GameplayEffectResolver.resolve(
                success(List.of("vent"), List.of("levitation"), 1.0, 300));

        GameplayEffect levitation = effects.stream()
                .filter(candidate -> candidate.effectId() != null
                        && candidate.effectId().equals("minecraft:levitation"))
                .findFirst()
                .orElseThrow();
        assertEquals(80, levitation.durationTicks());
    }

    @Test
    void strongCirclesRaiseTheAmplifierTier() {
        List<GameplayEffect> weak = GameplayEffectResolver.resolve(
                success(List.of("vent"), List.of("renforcement"), 1.0, 200));
        List<GameplayEffect> strong = GameplayEffectResolver.resolve(
                success(List.of("vent"), List.of("renforcement"), 2.0, 200));

        assertEquals(0, amplifierOf(weak, "minecraft:strength"));
        assertEquals(1, amplifierOf(strong, "minecraft:strength"));
    }

    @Test
    void purificationAndCoolingAreSpecialEffects() {
        List<GameplayEffect> effects = GameplayEffectResolver.resolve(
                success(List.of("eau"), List.of("purification", "refroidissement"), 1.0, 200));

        assertTrue(effects.stream().anyMatch(
                effect -> effect.kind() == GameplayEffect.Kind.CLEAR_HARMFUL));
        assertTrue(effects.stream().anyMatch(
                effect -> effect.kind() == GameplayEffect.Kind.EXTINGUISH_FIRE));
    }

    @Test
    void underfootWindGrantsFlightForTheSpellDuration() {
        List<GameplayEffect> effects = GameplayEffectResolver.resolve(
                success(List.of("vent_sous_pied"), List.of(), 1.0, 220));

        GameplayEffect flight = effects.stream()
                .filter(effect -> effect.kind() == GameplayEffect.Kind.GRANT_FLIGHT)
                .findFirst()
                .orElseThrow();
        assertEquals(220, flight.durationTicks());
    }

    @Test
    void plainWindDoesNotGrantFlight() {
        List<GameplayEffect> effects = GameplayEffectResolver.resolve(
                success(List.of("vent"), List.of(), 1.0, 220));

        assertTrue(effects.stream().noneMatch(
                effect -> effect.kind() == GameplayEffect.Kind.GRANT_FLIGHT));
    }

    private static int amplifierOf(List<GameplayEffect> effects, String id) {
        return effects.stream()
                .filter(effect -> effect.effectId() != null && effect.effectId().equals(id))
                .mapToInt(GameplayEffect::amplifier)
                .findFirst()
                .orElseThrow();
    }

    private static List<String> appliedIds(List<GameplayEffect> effects) {
        return effects.stream()
                .filter(effect -> effect.kind() == GameplayEffect.Kind.APPLY)
                .map(GameplayEffect::effectId)
                .toList();
    }

    private static ActivationResult success(
            List<String> sigils,
            List<String> signs,
            double power,
            int durationTicks) {
        return new ActivationResult(
                ActivationStatus.SUCCESS,
                "page-1",
                sigils,
                signs,
                power,
                0.9,
                durationTicks,
                0.0,
                0.0,
                0.0);
    }
}
