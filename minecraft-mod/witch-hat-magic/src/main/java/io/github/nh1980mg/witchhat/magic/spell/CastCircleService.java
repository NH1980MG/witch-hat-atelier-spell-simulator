package io.github.nh1980mg.witchhat.magic.spell;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Objects;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.core.particles.SimpleParticleType;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.phys.Vec3;

/**
 * A witch's casting circle: a glowing seal that spins up in front of her
 * while she channels, then releases. Each cast emits a rotating arc of
 * particles every tick until the channel completes.
 */
public final class CastCircleService {
    private static final CastCircleService INSTANCE = new CastCircleService();
    private static final int ARC_SAMPLES = 6;

    private final Deque<CastCircle> active = new ArrayDeque<>();

    private CastCircleService() {}

    public static CastCircleService instance() {
        return INSTANCE;
    }

    public void start(
            ServerLevel level,
            Vec3 center,
            Vec3 normal,
            int channelTicks,
            SimpleParticleType particle,
            Runnable onComplete) {
        active.addLast(new CastCircle(level, center, normal, channelTicks, particle, onComplete));
    }

    public void tick() {
        int size = active.size();
        for (int index = 0; index < size; index++) {
            CastCircle circle = active.pollFirst();
            if (circle == null) {
                return;
            }
            circle.emitArc();
            if (!circle.step()) {
                active.addLast(circle);
            }
        }
    }

    private static final class CastCircle {
        private final ServerLevel level;
        private final Vec3 center;
        private final Vec3 right;
        private final Vec3 up;
        private final SimpleParticleType particle;
        private final Runnable onComplete;
        private int remainingTicks;
        private double angle;

        private CastCircle(
                ServerLevel level,
                Vec3 center,
                Vec3 normal,
                int channelTicks,
                SimpleParticleType particle,
                Runnable onComplete) {
            this.level = level;
            this.center = center;
            Vec3 unitNormal = normal.normalize();
            Vec3 reference = Math.abs(unitNormal.y) > 0.9
                    ? new Vec3(1.0, 0.0, 0.0)
                    : new Vec3(0.0, 1.0, 0.0);
            this.right = unitNormal.cross(reference).normalize();
            this.up = right.cross(unitNormal).normalize();
            this.remainingTicks = channelTicks;
            this.particle = particle;
            this.onComplete = onComplete;
        }

        private void emitArc() {
            for (int index = 0; index < ARC_SAMPLES; index++) {
                double a = angle + index * (Math.PI / 3.0);
                Vec3 point = center
                        .add(right.scale(Math.cos(a) * 0.9))
                        .add(up.scale(Math.sin(a) * 0.9));
                level.sendParticles(particle, point.x, point.y, point.z, 1, 0, 0, 0, 0);
            }
            Vec3 rune = center.add(up.scale(0.05));
            level.sendParticles(ParticleTypes.ENCHANT, rune.x, rune.y, rune.z, 2, 0.2, 0.1, 0.2, 0.0);
        }

        /** @return true when the channel is still running. */
        private boolean step() {
            angle += Math.PI / 16.0; // one full spin per ~0.5s
            remainingTicks--;
            if (remainingTicks > 0) {
                return true;
            }
            onComplete.run();
            return false;
        }
    }
}
