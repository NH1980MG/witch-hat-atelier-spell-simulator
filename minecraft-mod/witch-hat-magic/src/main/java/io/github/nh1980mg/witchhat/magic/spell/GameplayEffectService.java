package io.github.nh1980mg.witchhat.magic.spell;

import java.util.List;
import java.util.Objects;
import net.minecraft.core.Holder;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.effect.MobEffect;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.entity.player.Player;

/** Applies resolved gameplay effects to the casting player, server-side. */
public final class GameplayEffectService {
    private GameplayEffectService() {}

    public static int apply(Player player, ActivationResult activation) {
        Objects.requireNonNull(player, "player");
        List<GameplayEffect> effects = GameplayEffectResolver.resolve(activation);
        int applied = 0;
        for (GameplayEffect effect : effects) {
            switch (effect.kind()) {
                case APPLY -> {
                    Holder<MobEffect> mobEffect = BuiltInRegistries.MOB_EFFECT
                            .getHolder(ResourceLocation.parse(effect.effectId()))
                            .orElse(null);
                    if (mobEffect != null) {
                        player.addEffect(new MobEffectInstance(
                                mobEffect,
                                effect.durationTicks(),
                                effect.amplifier(),
                                true,   // ambient
                                false,  // hide vanilla particles — the seal shows them
                                true)); // show icon
                        applied++;
                    }
                }
                case CLEAR_HARMFUL -> {
                    player.getActiveEffects().stream()
                            .filter(instance -> !instance.getEffect().value().isBeneficial())
                            .map(MobEffectInstance::getEffect)
                            .toList()
                            .forEach(player::removeEffect);
                    applied++;
                }
                case EXTINGUISH_FIRE -> {
                    player.clearFire();
                    applied++;
                }
            }
        }
        return applied;
    }
}
