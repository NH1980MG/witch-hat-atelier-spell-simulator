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
                    if (applySimple(player, effect.effectId(), effect.durationTicks(), effect.amplifier())) {
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
                case GRANT_FLIGHT -> {
                    if (player instanceof net.minecraft.server.level.ServerPlayer serverPlayer
                            && serverPlayer.getInventory().getArmor(0).is(
                                    io.github.nh1980mg.witchhat.magic.registry.MagicItems.SYLPH_SHOES)) {
                        FlightService.instance().grant(serverPlayer, effect.durationTicks());
                        applied++;
                    }
                }
            }
        }
        return applied;
    }

    public static boolean applySimple(Player player, String effectId, int durationTicks, int amplifier) {
        Holder<MobEffect> mobEffect = BuiltInRegistries.MOB_EFFECT
                .getHolder(ResourceLocation.parse(effectId))
                .orElse(null);
        if (mobEffect == null) {
            return false;
        }
        player.addEffect(new MobEffectInstance(
                mobEffect,
                durationTicks,
                amplifier,
                true,   // ambient
                false,  // hide vanilla particles — the seal shows them
                true)); // show icon
        return true;
    }
}
