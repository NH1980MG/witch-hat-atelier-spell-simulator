package io.github.nh1980mg.witchhat.magic.spell;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.minecraft.world.phys.Vec3;
import org.junit.jupiter.api.Test;

final class ManifestationPlanTest {
    @Test
    void mapsMajorSigilFamiliesToDistinctParticles() {
        assertSame(
                ManifestationParticleProfile.FIRE,
                ManifestationParticleProfile.forSigils(List.of("feu")));
        assertSame(
                ManifestationParticleProfile.WATER,
                ManifestationParticleProfile.forSigils(List.of("eau")));
        assertSame(
                ManifestationParticleProfile.EARTH,
                ManifestationParticleProfile.forSigils(List.of("terre")));
        assertSame(
                ManifestationParticleProfile.WIND,
                ManifestationParticleProfile.forSigils(List.of("vent")));
        assertSame(
                ManifestationParticleProfile.LIGHT,
                ManifestationParticleProfile.forSigils(List.of("lumiere")));
        assertSame(
                ManifestationParticleProfile.SMOKE,
                ManifestationParticleProfile.forSigils(List.of("fumee")));
        assertSame(
                ManifestationParticleProfile.CRYSTAL,
                ManifestationParticleProfile.forSigils(List.of("cristal")));
        assertSame(
                ManifestationParticleProfile.ARCANE,
                ManifestationParticleProfile.forSigils(List.of("dragon")));
    }

    @Test
    void buildsABoundedSealCenteredInFrontOfThePlayer() {
        Vec3 eye = new Vec3(10.0, 20.0, 30.0);
        Vec3 look = new Vec3(0.0, 0.0, 1.0);
        ActivationResult result = new ActivationResult(
                ActivationStatus.SUCCESS,
                "page-1",
                List.of("eau"),
                List.of("lien"));

        ManifestationPlan plan = ManifestationPlan.create(eye, look, result);

        assertSame(ManifestationParticleProfile.WATER, plan.particleProfile());
        assertEquals(new Vec3(10.0, 20.0, 32.5), plan.center());
        assertEquals(104, plan.points().size());
        assertTrue(plan.points().size() <= ManifestationGeometry.MAX_POINTS);
        assertTrue(plan.points().stream().allMatch(ManifestationPlanTest::isFinite));
    }

    @Test
    void rejectsFailedActivationsAndMissingSigils() {
        assertThrows(IllegalArgumentException.class, () -> ManifestationPlan.create(
                Vec3.ZERO,
                new Vec3(0.0, 0.0, 1.0),
                ActivationResult.failure(ActivationStatus.MISSING_SIGIL, "page-1")));
        assertThrows(IllegalArgumentException.class, () -> ManifestationPlan.create(
                Vec3.ZERO,
                new Vec3(0.0, 0.0, 1.0),
                new ActivationResult(
                        ActivationStatus.SUCCESS, "page-1", List.of(), List.of())));
    }

    @Test
    void anchorsThePlanAtAnExplicitCenter() {
        ActivationResult result = new ActivationResult(
                ActivationStatus.SUCCESS,
                "page-1",
                List.of("feu"),
                List.of(),
                1.0,
                0.9,
                280);

        ManifestationPlan plan = ManifestationPlan.createAnchored(
                new Vec3(5.0, 65.0, 5.0),
                new Vec3(0.0, 1.0, 0.0),
                result);

        assertEquals(new Vec3(5.0, 65.0, 5.0), plan.center());
        assertSame(ManifestationParticleProfile.FIRE, plan.particleProfile());
        assertEquals(104, plan.points().size());
    }

    @Test
    void scalesRadiusWithPowerWithoutExceedingThePointCap() {
        ManifestationPlan weak = ManifestationPlan.createAnchored(
                Vec3.ZERO, new Vec3(0.0, 1.0, 0.0), successWithPower(0.5));
        ManifestationPlan strong = ManifestationPlan.createAnchored(
                Vec3.ZERO, new Vec3(0.0, 1.0, 0.0), successWithPower(3.0));

        double weakReach = maxHorizontalDistance(weak);
        double strongReach = maxHorizontalDistance(strong);
        assertTrue(strongReach > weakReach * 2.0,
                "power 3x should reach much further than 0.5x: " + weakReach + " vs " + strongReach);
        assertTrue(strong.points().size() <= ManifestationGeometry.MAX_POINTS);
        assertEquals(104, strong.points().size());
    }

    private static ActivationResult successWithPower(double power) {
        return new ActivationResult(
                ActivationStatus.SUCCESS,
                "page-1",
                List.of("eau"),
                List.of(),
                power,
                0.9,
                280);
    }

    private static double maxHorizontalDistance(ManifestationPlan plan) {
        return plan.points().stream()
                .mapToDouble(point -> Math.hypot(
                        point.x - plan.center().x, point.z - plan.center().z))
                .max()
                .orElse(0.0);
    }

    private static boolean isFinite(Vec3 point) {
        return Double.isFinite(point.x)
                && Double.isFinite(point.y)
                && Double.isFinite(point.z);
    }
}
