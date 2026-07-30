package io.github.nh1980mg.witchhat.magic.spell;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import net.minecraft.world.phys.Vec3;

public final class ManifestationGeometry {
    public static final int MAX_POINTS = 128;

    private ManifestationGeometry() {}

    public static List<Vec3> circle(
            Vec3 center,
            Vec3 normal,
            double radius,
            int samples) {
        requireFinite(center, "center");
        requireFinite(normal, "normal");
        if (!Double.isFinite(radius) || radius <= 0.0) {
            throw new IllegalArgumentException("Circle radius must be finite and positive");
        }
        requireSamples(samples, 3);
        Vec3 unitNormal = normalizeStable(normal);
        Vec3 reference = Math.abs(unitNormal.y) > 0.9
                ? new Vec3(1.0, 0.0, 0.0)
                : new Vec3(0.0, 1.0, 0.0);
        Vec3 right = unitNormal.cross(reference).normalize();
        Vec3 up = right.cross(unitNormal).normalize();
        List<Vec3> points = new ArrayList<>(samples);
        for (int index = 0; index < samples; index++) {
            double angle = Math.PI * 2.0 * index / samples;
            Vec3 point = center
                    .add(right.scale(Math.cos(angle) * radius))
                    .add(up.scale(Math.sin(angle) * radius));
            requireFinite(point, "circle point");
            points.add(point);
        }
        return List.copyOf(points);
    }

    public static List<Vec3> line(Vec3 start, Vec3 end, int samples) {
        requireFinite(start, "start");
        requireFinite(end, "end");
        requireSamples(samples, 2);
        List<Vec3> points = new ArrayList<>(samples);
        for (int index = 0; index < samples; index++) {
            Vec3 point = start.lerp(end, (double) index / (samples - 1));
            requireFinite(point, "line point");
            points.add(point);
        }
        return List.copyOf(points);
    }

    private static Vec3 normalizeStable(Vec3 vector) {
        double largestComponent = Math.max(
                Math.abs(vector.x),
                Math.max(Math.abs(vector.y), Math.abs(vector.z)));
        if (largestComponent == 0.0) {
            throw new IllegalArgumentException("Circle normal must be non-zero");
        }
        Vec3 normalized = vector.scale(1.0 / largestComponent).normalize();
        requireFinite(normalized, "normalized direction");
        if (normalized.lengthSqr() < 1.0E-12) {
            throw new IllegalArgumentException("Circle normal must be non-zero");
        }
        return normalized;
    }

    private static void requireSamples(int samples, int minimum) {
        if (samples < minimum || samples > MAX_POINTS) {
            throw new IllegalArgumentException(
                    "Geometry samples must be between " + minimum + " and " + MAX_POINTS);
        }
    }

    private static void requireFinite(Vec3 vector, String label) {
        Objects.requireNonNull(vector, label);
        if (!Double.isFinite(vector.x)
                || !Double.isFinite(vector.y)
                || !Double.isFinite(vector.z)) {
            throw new IllegalArgumentException(label + " must be finite");
        }
    }
}
