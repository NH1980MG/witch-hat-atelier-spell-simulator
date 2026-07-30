package io.github.nh1980mg.witchhat.magic.spell;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import net.minecraft.world.phys.Vec3;

public record ManifestationPlan(
        ManifestationParticleProfile particleProfile,
        Vec3 center,
        List<Vec3> points) {
    private static final double DISTANCE_FROM_PLAYER = 2.5;
    private static final double OUTER_RADIUS = 1.0;
    private static final double INNER_RADIUS = 0.45;
    private static final int OUTER_SAMPLES = 48;
    private static final int INNER_SAMPLES = 24;
    private static final int SPOKE_COUNT = 8;
    private static final int SPOKE_SAMPLES = 4;

    public ManifestationPlan {
        particleProfile = Objects.requireNonNull(particleProfile, "particleProfile");
        center = Objects.requireNonNull(center, "center");
        points = List.copyOf(Objects.requireNonNull(points, "points"));
        if (points.size() > ManifestationGeometry.MAX_POINTS) {
            throw new IllegalArgumentException("Manifestation exceeds the point limit");
        }
    }

    public static ManifestationPlan create(
            Vec3 eyePosition,
            Vec3 lookDirection,
            ActivationResult activation) {
        Objects.requireNonNull(eyePosition, "eyePosition");
        Objects.requireNonNull(lookDirection, "lookDirection");
        Objects.requireNonNull(activation, "activation");
        if (activation.status() != ActivationStatus.SUCCESS) {
            throw new IllegalArgumentException("Only successful activations can manifest");
        }
        if (activation.sigilIds().isEmpty()) {
            throw new IllegalArgumentException("A manifestation requires at least one sigil");
        }
        if (!isFinite(eyePosition) || !isFinite(lookDirection)
                || lookDirection.lengthSqr() < 1.0E-12) {
            throw new IllegalArgumentException("Manifestation position and direction must be valid");
        }

        Vec3 normal = lookDirection.normalize();
        Vec3 center = eyePosition.add(normal.scale(DISTANCE_FROM_PLAYER));
        List<Vec3> points = new ArrayList<>();
        points.addAll(ManifestationGeometry.circle(
                center, normal, OUTER_RADIUS, OUTER_SAMPLES));
        points.addAll(ManifestationGeometry.circle(
                center, normal, INNER_RADIUS, INNER_SAMPLES));

        List<Vec3> outerAnchors = ManifestationGeometry.circle(
                center, normal, OUTER_RADIUS, SPOKE_COUNT);
        List<Vec3> innerAnchors = ManifestationGeometry.circle(
                center, normal, INNER_RADIUS, SPOKE_COUNT);
        for (int index = 0; index < SPOKE_COUNT; index++) {
            points.addAll(ManifestationGeometry.line(
                    innerAnchors.get(index), outerAnchors.get(index), SPOKE_SAMPLES));
        }

        return new ManifestationPlan(
                ManifestationParticleProfile.forSigils(activation.sigilIds()),
                center,
                points);
    }

    private static boolean isFinite(Vec3 vector) {
        return Double.isFinite(vector.x)
                && Double.isFinite(vector.y)
                && Double.isFinite(vector.z);
    }
}
