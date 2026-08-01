package io.github.nh1980mg.witchhat.magic.spell;

import java.util.List;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.core.particles.SimpleParticleType;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.monster.Witch;
import net.minecraft.world.phys.Vec3;

/**
 * The Brimmed Cap arsenal. Every cast spins a seal up in front of the witch
 * for a short channel, then the effect lands — no potions, only ink.
 */
public final class WitchSpells {
    public record Spell(
            String id,
            SimpleParticleType particle,
            int channelTicks,
            int cooldownTicks,
            SpellEffect effect) {
        @FunctionalInterface
        public interface SpellEffect {
            void apply(Witch caster, LivingEntity target);
        }
    }

    private WitchSpells() {}

    /** The matriarch's full arsenal. */
    public static final List<Spell> BOSS_SPELLS = List.of(
            new Spell("fire_bolt", ParticleTypes.FLAME, 25, 60, (caster, target) -> {
                target.hurt(caster.damageSources().indirectMagic(caster, caster), 7.0F);
                target.igniteForSeconds(4.0F);
            }),
            new Spell("wind_burst", ParticleTypes.CLOUD, 20, 80, (caster, target) -> {
                Vec3 shove = target.position().subtract(caster.position())
                        .normalize().scale(1.6).add(0.0, 0.6, 0.0);
                target.push(shove.x, shove.y, shove.z);
                target.hurt(caster.damageSources().indirectMagic(caster, caster), 3.0F);
            }),
            new Spell("ink_bind", ParticleTypes.LARGE_SMOKE, 30, 100, (caster, target) -> {
                target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 100, 2));
                target.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 100, 1));
            }),
            new Spell("crystal_lance", ParticleTypes.SNOWFLAKE, 30, 90, (caster, target) ->
                target.hurt(caster.damageSources().indirectMagic(caster, caster), 9.0F)),
            new Spell("ink_rain", ParticleTypes.FALLING_OBSIDIAN_TEAR, 40, 140, (caster, target) -> {
                target.hurt(caster.damageSources().indirectMagic(caster, caster), 4.0F);
                target.addEffect(new MobEffectInstance(MobEffects.BLINDNESS, 60, 0));
                target.addEffect(new MobEffectInstance(MobEffects.POISON, 100, 0));
            }),
            new Spell("mend", ParticleTypes.HAPPY_VILLAGER, 35, 160, (caster, target) ->
                caster.heal(10.0F)));

    /** The scouts' lighter pair. */
    public static final List<Spell> SCOUT_SPELLS = List.of(
            new Spell("fire_bolt", ParticleTypes.FLAME, 25, 80, (caster, target) -> {
                target.hurt(caster.damageSources().indirectMagic(caster, caster), 4.0F);
                target.igniteForSeconds(2.0F);
            }),
            new Spell("ink_bind", ParticleTypes.LARGE_SMOKE, 30, 120, (caster, target) ->
                target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 80, 1))));

    /** Spin the seal in front of the caster, then fire the spell effect. */
    public static void cast(Witch caster, LivingEntity target, Spell spell) {
        Vec3 look = caster.getLookAngle().normalize();
        Vec3 center = caster.getEyePosition().add(look.scale(1.2));
        CastCircleService.instance().start(
                (ServerLevel) caster.level(),
                center,
                look,
                spell.channelTicks(),
                spell.particle(),
                () -> {
                    if (caster.isAlive() && target.isAlive()) {
                        spell.effect().apply(caster, target);
                    }
                });
    }
}
