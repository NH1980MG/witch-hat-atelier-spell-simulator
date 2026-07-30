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
        if (!isFinite(eyePosition) || !isFinite(lookDirection)
                || lookDirection.lengthSqr() < 1.0E-12) {
            throw new IllegalArgumentException("Manifestation position and direction must be valid");
        }
        Vec3 normal = lookDirection.normalize();
        return createAnchored(
                eyePosition.add(normal.scale(DISTANCE_FROM_PLAYER)),
                normal,
                activation);
    }

    public static ManifestationPlan createAnchored(
            Vec3 center,
            Vec3 facingNormal,
            ActivationResult activation) {
        Objects.requireNonNull(center, "center");
        Objects.requireNonNull(facingNormal, "facingNormal");
        Objects.requireNonNull(activation, "activation");
        if (activation.status() != ActivationStatus.SUCCESS) {
            throw new IllegalArgumentException("Only successful activations can manifest");
        }
        if (activation.sigilIds().isEmpty()) {
            throw new IllegalArgumentException("A manifestation requires at least one sigil");
        }
        if (!isFinite(center) || !isFinite(facingNormal)
                || facingNormal.lengthSqr() < 1.0E-12) {
            throw new IllegalArgumentException("Manifestation center and normal must be valid");
        }

        Vec3 normal = facingNormal.normalize();
        double radiusScale = 0.6 + 0.4 * Math.max(0.0, activation.power());
        double outerRadius = OUTER_RADIUS * radiusScale;
        double innerRadius = INNER_RADIUS * radiusScale;
        List<Vec3> points = new ArrayList<>();
        points.addAll(ManifestationGeometry.circle(
                center, normal, outerRadius, OUTER_SAMPLES));
        points.addAll(ManifestationGeometry.circle(
                center, normal, innerRadius, INNER_SAMPLES));

        SignFormProfile form = SignFormProfile.forSigns(activation.signIds());
        if (form == SignFormProfile.NONE) {
            List<Vec3> outerAnchors = ManifestationGeometry.circle(
                    center, normal, outerRadius, SPOKE_COUNT);
            List<Vec3> innerAnchors = ManifestationGeometry.circle(
                    center, normal, innerRadius, SPOKE_COUNT);
            for (int index = 0; index < SPOKE_COUNT; index++) {
                points.addAll(ManifestationGeometry.line(
                        innerAnchors.get(index), outerAnchors.get(index), SPOKE_SAMPLES));
            }
        } else {
            points.addAll(SignFormGeometry.build(
                    form, center, tiltedDirection(normal, activation), radiusScale));
        }

        return new ManifestationPlan(
                ManifestationParticleProfile.forSigils(activation.sigilIds()),
                center,
                points);
    }

    /**
     * Manga rule: an imbalance between the signs leans the manifestation.
     * The page-space directivity (x right, y down on the page) is mapped onto
     * the seal plane and bends the projection axis, capped well under 45
     * degrees so the seal never reverses.
     */
    private static final double TILT_STRENGTH = 0.75;

    private static Vec3 tiltedDirection(Vec3 normal, ActivationResult activation) {
        double directionX = activation.directionX();
        double directionY = activation.directionY();
        if (directionX == 0.0 && directionY == 0.0) {
            return normal;
        }
        Vec3 reference = Math.abs(normal.y) > 0.9
                ? new Vec3(1.0, 0.0, 0.0)
                : new Vec3(0.0, 1.0, 0.0);
        Vec3 right = normal.cross(reference).normalize();
        Vec3 upInPlane = right.cross(normal).normalize();
        Vec3 tilted = normal
                .add(right.scale(directionX * TILT_STRENGTH))
                .add(upInPlane.scale(-directionY * TILT_STRENGTH));
        return tilted.normalize();
    }

    private static boolean isFinite(Vec3 vector) {
        return Double.isFinite(vector.x)
                && Double.isFinite(vector.y)
                && Double.isFinite(vector.z);
    }
}
