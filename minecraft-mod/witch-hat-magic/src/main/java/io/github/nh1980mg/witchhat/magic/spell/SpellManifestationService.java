package io.github.nh1980mg.witchhat.magic.spell;

import net.minecraft.core.particles.SimpleParticleType;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;

public final class SpellManifestationService {
    private static final ManifestationScheduler SCHEDULER = new ManifestationScheduler();

    private SpellManifestationService() {}

    public static ManifestationScheduler scheduler() {
        return SCHEDULER;
    }

    public static boolean show(ServerPlayer player, ActivationResult activation) {
        if (activation.status() != ActivationStatus.SUCCESS) {
            return false;
        }

        ManifestationPlan plan = ManifestationPlan.create(
                player.getEyePosition(),
                player.getLookAngle(),
                activation);
        enqueue(plan, activation.durationTicks(), player.serverLevel(), levitationDrift(activation));
        return true;
    }

    public static void enqueue(ManifestationPlan plan, int durationTicks, ServerLevel level) {
        enqueue(plan, durationTicks, level, net.minecraft.world.phys.Vec3.ZERO);
    }

    public static void enqueue(
            ManifestationPlan plan,
            int durationTicks,
            ServerLevel level,
            net.minecraft.world.phys.Vec3 perTickDrift) {
        SimpleParticleType particle = plan.particleProfile().particle();
        SCHEDULER.enqueue(plan, durationTicks, point -> level.sendParticles(
                particle,
                point.x,
                point.y,
                point.z,
                1,
                0.0,
                0.0,
                0.0,
                0.0), perTickDrift);
    }

    /** Levitation sign: the manifestation floats upward over its duration. */
    public static net.minecraft.world.phys.Vec3 levitationDrift(ActivationResult activation) {
        return activation.lift() > 0.0
                ? new net.minecraft.world.phys.Vec3(0.0, 0.03 * activation.lift(), 0.0)
                : net.minecraft.world.phys.Vec3.ZERO;
    }
}
