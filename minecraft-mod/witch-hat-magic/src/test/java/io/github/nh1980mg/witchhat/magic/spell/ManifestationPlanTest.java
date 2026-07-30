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
                List.of("orbe"));

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

    private static boolean isFinite(Vec3 point) {
        return Double.isFinite(point.x)
                && Double.isFinite(point.y)
                && Double.isFinite(point.z);
    }
}
