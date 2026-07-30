package io.github.nh1980mg.witchhat.magic.spell;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import net.minecraft.world.phys.Vec3;

/**
 * Builds the sign-shaped geometry appended to the base seal rings. Every
 * shape stays within the remaining point budget (56 points under
 * {@link ManifestationGeometry#MAX_POINTS}) and is fully deterministic.
 */
public final class SignFormGeometry {
    public static final int MAX_FORM_POINTS = 56;

    private static final Vec3 UP = new Vec3(0.0, 1.0, 0.0);

    private SignFormGeometry() {}

    public static List<Vec3> build(
            SignFormProfile form,
            Vec3 center,
            Vec3 axis,
            double radiusScale) {
        Objects.requireNonNull(form, "form");
        Objects.requireNonNull(center, "center");
        Objects.requireNonNull(axis, "axis");
        List<Vec3> points = switch (form) {
            case NONE -> List.of();
            case COLUMN -> column(center, axis, radiusScale, 0.0);
            case DIFFUSE_COLUMN -> column(center, axis, radiusScale, 0.35 * radiusScale);
            case ORB -> orb(center, radiusScale);
            case BOLT -> volley(center, axis, radiusScale, 2, 0.0);
            case VOLLEY -> volley(center, axis, radiusScale, 4, 0.3);
            case RAIN -> rain(center, radiusScale);
            case DISPERSION -> dispersion(center, radiusScale);
        };
        if (points.size() > MAX_FORM_POINTS) {
            throw new IllegalStateException("Sign form exceeds the point budget: " + form);
        }
        return points;
    }

    /** Shaft of stacked rings projected along the (possibly tilted) axis. */
    private static List<Vec3> column(Vec3 center, Vec3 axis, double radiusScale, double jitter) {
        double radius = 0.45 * radiusScale;
        double height = 1.6 * radiusScale;
        List<Vec3> points = new ArrayList<>();
        int ringCount = 4;
        int perRing = 10;
        for (int ring = 0; ring < ringCount; ring++) {
            double distance = height * ring / (ringCount - 1);
            List<Vec3> ringPoints = ManifestationGeometry.circle(
                    center.add(axis.scale(distance)), axis, radius, perRing);
            for (int index = 0; index < perRing; index++) {
                points.add(scatter(ringPoints.get(index), jitter, ring * perRing + index));
            }
        }
        points.addAll(ManifestationGeometry.line(
                center, center.add(axis.scale(height)), MAX_FORM_POINTS - ringCount * perRing));
        return points;
    }

    /** Sphere shell of latitude rings around the seal center. */
    private static List<Vec3> orb(Vec3 center, double radiusScale) {
        double radius = 0.8 * radiusScale;
        List<Vec3> points = new ArrayList<>();
        int latitudes = 4;
        int perLatitude = 12;
        for (int lat = 0; lat < latitudes; lat++) {
            double phi = Math.PI * (lat + 1) / (latitudes + 1) - Math.PI / 2.0;
            double ringRadius = radius * Math.cos(phi);
            double y = radius * Math.sin(phi);
            points.addAll(ManifestationGeometry.circle(
                    center.add(0.0, y, 0.0), UP, Math.max(0.05, ringRadius), perLatitude));
        }
        points.addAll(ManifestationGeometry.line(
                center.add(0.0, -radius, 0.0),
                center.add(0.0, radius, 0.0),
                MAX_FORM_POINTS - latitudes * perLatitude));
        return points;
    }

    /** One or more straight bolt streams shot along the facing normal. */
    private static List<Vec3> volley(
            Vec3 center,
            Vec3 normal,
            double radiusScale,
            int streams,
            double spreadAngle) {
        double range = 2.5 * radiusScale;
        int perStream = MAX_FORM_POINTS / streams;
        Vec3 side = normal.cross(UP).normalize();
        List<Vec3> points = new ArrayList<>();
        for (int stream = 0; stream < streams; stream++) {
            double offset = streams == 1 ? 0.0 : spreadAngle * (stream - (streams - 1) / 2.0);
            Vec3 direction = normal.add(side.scale(offset)).normalize();
            points.addAll(ManifestationGeometry.line(
                    center, center.add(direction.scale(range)), perStream));
        }
        return points;
    }

    /** Flat grid of droplets hanging above the seal. */
    private static List<Vec3> rain(Vec3 center, double radiusScale) {
        double extent = 0.9 * radiusScale;
        double height = 1.4 * radiusScale;
        List<Vec3> points = new ArrayList<>();
        int grid = 7;
        for (int x = 0; x < grid; x++) {
            for (int z = 0; z < grid; z++) {
                int index = x * grid + z;
                if (index >= MAX_FORM_POINTS) {
                    break;
                }
                double dx = extent * (2.0 * x / (grid - 1) - 1.0);
                double dz = extent * (2.0 * z / (grid - 1) - 1.0);
                double dy = height * (0.75 + 0.25 * hash(index));
                points.add(center.add(dx, dy, dz));
            }
        }
        return points;
    }

    /** Deterministic cloud of motes filling a sphere around the seal. */
    private static List<Vec3> dispersion(Vec3 center, double radiusScale) {
        double radius = 1.0 * radiusScale;
        List<Vec3> points = new ArrayList<>(MAX_FORM_POINTS);
        for (int index = 0; index < MAX_FORM_POINTS; index++) {
            double theta = 2.0 * Math.PI * hash(index);
            double phi = Math.acos(2.0 * hash(index + 1000) - 1.0);
            double r = radius * Math.cbrt(hash(index + 2000));
            points.add(center.add(
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.cos(phi),
                    r * Math.sin(phi) * Math.sin(theta)));
        }
        return points;
    }

    private static Vec3 scatter(Vec3 point, double amplitude, int seed) {
        if (amplitude <= 0.0) {
            return point;
        }
        return point.add(
                amplitude * (hash(seed) - 0.5),
                amplitude * 0.25 * (hash(seed + 500) - 0.5),
                amplitude * (hash(seed + 1000) - 0.5));
    }

    /** Stable pseudo-random in [0, 1) so manifestations replay identically. */
    private static double hash(int seed) {
        int value = seed * 0x9E3779B1;
        value ^= value >>> 16;
        value *= 0x85EBCA6B;
        value ^= value >>> 13;
        return (value & 0xFFFFFF) / (double) 0x1000000;
    }
}
