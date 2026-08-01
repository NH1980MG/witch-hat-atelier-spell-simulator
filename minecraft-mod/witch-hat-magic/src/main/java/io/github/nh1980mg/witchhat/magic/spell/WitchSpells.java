package io.github.nh1980mg.witchhat.magic.spell;

import java.util.List;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.monster.Witch;
import net.minecraft.world.phys.Vec3;

/**
 * The Brimmed Cap arsenal — built from the SAME sigil/sign combinations a
 * player would draw, so a witch's seal looks and behaves exactly like the
 * spell a player would cast with the same circle.
 */
public final class WitchSpells {
    public record Spell(
            String id,
            List<String> sigilIds,
            List<String> signIds,
            int channelTicks,
            int cooldownTicks,
            SpellEffect effect) {
        @FunctionalInterface
        public interface SpellEffect {
            void apply(Witch caster, LivingEntity target);
        }
    }

    private static final double BOSS_POWER = 1.5;
    private static final double SCOUT_POWER = 0.8;
    private static final double SPIN_PER_TICK = Math.PI / 24.0;

    private WitchSpells() {}

    /** The matriarch's full arsenal. */
    public static final List<Spell> BOSS_SPELLS = List.of(
            new Spell("fire_bolt", List.of("feu"), List.of("projectile"), 25, 60, (caster, target) -> {
                target.hurt(caster.damageSources().indirectMagic(caster, caster), 7.0F);
                target.igniteForSeconds(4.0F);
            }),
            new Spell("wind_burst", List.of("vent"), List.of("dispersion"), 20, 80, (caster, target) -> {
                Vec3 shove = target.position().subtract(caster.position())
                        .normalize().scale(1.6).add(0.0, 0.6, 0.0);
                target.push(shove.x, shove.y, shove.z);
                target.hurt(caster.damageSources().indirectMagic(caster, caster), 3.0F);
            }),
            new Spell("ink_bind", List.of("fumee"), List.of("arret"), 30, 100, (caster, target) -> {
                target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 100, 2));
                target.addEffect(new MobEffectInstance(MobEffects.WEAKNESS, 100, 1));
            }),
            new Spell("crystal_lance", List.of("cristal"), List.of("projectile"), 30, 90, (caster, target) ->
                target.hurt(caster.damageSources().indirectMagic(caster, caster), 9.0F)),
            new Spell("ink_rain", List.of("sangsue_valance"), List.of("pluie"), 40, 140, (caster, target) -> {
                target.hurt(caster.damageSources().indirectMagic(caster, caster), 4.0F);
                target.addEffect(new MobEffectInstance(MobEffects.BLINDNESS, 60, 0));
                target.addEffect(new MobEffectInstance(MobEffects.POISON, 100, 0));
            }),
            new Spell("mend", List.of("lumiere"), List.of("purification"), 35, 160, (caster, target) ->
                caster.heal(10.0F)));

    /** The scouts' lighter pair. */
    public static final List<Spell> SCOUT_SPELLS = List.of(
            new Spell("fire_bolt", List.of("feu"), List.of("projectile"), 25, 80, (caster, target) -> {
                target.hurt(caster.damageSources().indirectMagic(caster, caster), 4.0F);
                target.igniteForSeconds(2.0F);
            }),
            new Spell("ink_bind", List.of("fumee"), List.of("arret"), 30, 120, (caster, target) ->
                target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 80, 1))));

    /**
     * Channels through the player spell pipeline: the caster's seal is the
     * exact plan a player would get from the same circle, spinning while the
     * cast completes, then the effect lands.
     */
    public static void cast(Witch caster, LivingEntity target, Spell spell, double power) {
        Vec3 look = caster.getLookAngle().normalize();
        ActivationResult activation = new ActivationResult(
                ActivationStatus.SUCCESS,
                "witch-cast",
                spell.sigilIds(),
                spell.signIds(),
                power,
                1.0,
                spell.channelTicks(),
                0.0,
                0.0,
                0.0);
        ManifestationPlan plan = ManifestationPlan.createAnchored(
                caster.getEyePosition().add(look.scale(1.2)),
                look,
                activation);
        SpellManifestationService.enqueueWithSpin(
                plan,
                spell.channelTicks(),
                (ServerLevel) caster.level(),
                SPIN_PER_TICK);
        CastCircleService.instance().schedule(
                spell.channelTicks(),
                () -> {
                    if (caster.isAlive() && target.isAlive()) {
                        spell.effect().apply(caster, target);
                    }
                });
    }
}
