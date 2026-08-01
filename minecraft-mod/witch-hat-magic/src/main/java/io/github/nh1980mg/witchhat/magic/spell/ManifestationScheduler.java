package io.github.nh1980mg.witchhat.magic.spell;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Objects;
import net.minecraft.world.phys.Vec3;

/**
 * Drains manifestation plans over their duration: each tick emits a slice of
 * the remaining points so a spell stays visible for its full duration instead
 * of a single-tick burst. Pure logic — the emitter callback owns the world.
 */
public final class ManifestationScheduler {
    @FunctionalInterface
    public interface Emitter {
        void emit(Vec3 point);
    }

    private final Deque<Entry> pending = new ArrayDeque<>();

    public void enqueue(ManifestationPlan plan, int durationTicks, Emitter emitter) {
        enqueue(plan, durationTicks, emitter, Vec3.ZERO);
    }

    public void enqueue(ManifestationPlan plan, int durationTicks, Emitter emitter, Vec3 perTickDrift) {
        enqueue(plan, durationTicks, emitter, perTickDrift, 0.0);
    }

    public void enqueue(
            ManifestationPlan plan,
            int durationTicks,
            Emitter emitter,
            Vec3 perTickDrift,
            double spinPerTick) {
        Objects.requireNonNull(plan, "plan");
        Objects.requireNonNull(emitter, "emitter");
        Objects.requireNonNull(perTickDrift, "perTickDrift");
        pending.addLast(new Entry(plan, Math.max(0, durationTicks), emitter, perTickDrift, spinPerTick));
    }

    public void tick() {
        int size = pending.size();
        for (int index = 0; index < size; index++) {
            Entry entry = pending.pollFirst();
            if (entry == null) {
                return;
            }
            entry.emitSlice();
            if (entry.hasRemaining()) {
                pending.addLast(entry);
            }
        }
    }

    public int pendingCount() {
        return pending.size();
    }

    private static final class Entry {
        private final Emitter emitter;
        private final Vec3 perTickDrift;
        private final double spinPerTick;
        private final Vec3 center;
        private final Vec3 axis;
        private final List<Vec3> remainingPoints;
        private int remainingTicks;
        private int elapsedTicks;

        private Entry(
                ManifestationPlan plan,
                int durationTicks,
                Emitter emitter,
                Vec3 perTickDrift,
                double spinPerTick) {
            this.emitter = emitter;
            this.perTickDrift = perTickDrift;
            this.spinPerTick = spinPerTick;
            this.center = plan.center();
            this.axis = spinPerTick != 0.0
                    ? plan.normal().normalize()
                    : Vec3.ZERO;
            this.remainingPoints = new ArrayList<>(plan.points());
            this.remainingTicks = durationTicks;
        }

        private void emitSlice() {
            int slice = remainingTicks <= 1
                    ? remainingPoints.size()
                    : (int) Math.ceil((double) remainingPoints.size() / remainingTicks);
            Vec3 drift = perTickDrift.scale(elapsedTicks);
            double rotation = spinPerTick * elapsedTicks;
            for (int index = 0; index < slice && !remainingPoints.isEmpty(); index++) {
                Vec3 point = remainingPoints.removeFirst();
                if (rotation != 0.0) {
                    point = rotateAroundAxis(point, rotation);
                }
                emitter.emit(point.add(drift));
            }
            remainingTicks = Math.max(0, remainingTicks - 1);
            elapsedTicks++;
        }

        private Vec3 rotateAroundAxis(Vec3 point, double angle) {
            Vec3 relative = point.subtract(center);
            double cos = Math.cos(angle);
            double sin = Math.sin(angle);
            Vec3 rotated = relative.scale(cos)
                    .add(axis.cross(relative).scale(sin))
                    .add(axis.scale(axis.dot(relative) * (1.0 - cos)));
            return center.add(rotated);
        }

        private boolean hasRemaining() {
            return !remainingPoints.isEmpty() && remainingTicks > 0;
        }
    }
}
