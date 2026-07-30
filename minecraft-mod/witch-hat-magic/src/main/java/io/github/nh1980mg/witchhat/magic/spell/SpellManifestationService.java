package io.github.nh1980mg.witchhat.magic.spell;

import net.minecraft.core.particles.SimpleParticleType;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.phys.Vec3;

public final class SpellManifestationService {
    private SpellManifestationService() {}

    public static boolean show(ServerPlayer player, ActivationResult activation) {
        if (activation.status() != ActivationStatus.SUCCESS) {
            return false;
        }

        ManifestationPlan plan = ManifestationPlan.create(
                player.getEyePosition(),
                player.getLookAngle(),
                activation);
        ServerLevel level = player.serverLevel();
        SimpleParticleType particle = plan.particleProfile().particle();
        for (Vec3 point : plan.points()) {
            level.sendParticles(
                    particle,
                    point.x,
                    point.y,
                    point.z,
                    1,
                    0.0,
                    0.0,
                    0.0,
                    0.0);
        }
        return true;
    }
}
