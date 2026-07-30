package io.github.nh1980mg.witchhat.magic.spell;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.minecraft.world.phys.Vec3;
import org.junit.jupiter.api.Test;

final class SignFormGeometryTest {
    private static final Vec3 CENTER = new Vec3(5.0, 65.0, 5.0);
    private static final Vec3 NORMAL = new Vec3(0.0, 0.0, 1.0);

    @Test
    void mapsPrincipalSignsToTheirForms() {
        assertEquals(SignFormProfile.COLUMN, SignFormProfile.forSigns(List.of("colonne")));
        assertEquals(SignFormProfile.ORB, SignFormProfile.forSigns(List.of("orbe")));
        assertEquals(SignFormProfile.BOLT, SignFormProfile.forSigns(List.of("projectile")));
        assertEquals(SignFormProfile.RAIN, SignFormProfile.forSigns(List.of("pluie")));
        assertEquals(SignFormProfile.DISPERSION, SignFormProfile.forSigns(List.of("dispersion")));
        assertEquals(SignFormProfile.NONE, SignFormProfile.forSigns(List.of("lien", "arret")));
    }

    @Test
    void combinesDispersionWithColumnAndBolt() {
        assertEquals(SignFormProfile.DIFFUSE_COLUMN,
                SignFormProfile.forSigns(List.of("colonne", "dispersion")));
        assertEquals(SignFormProfile.VOLLEY,
                SignFormProfile.forSigns(List.of("projectile", "dispersion")));
    }

    @Test
    void columnProjectsAlongTheGivenAxis() {
        List<Vec3> points = SignFormGeometry.build(
                SignFormProfile.COLUMN, CENTER, NORMAL, 1.0);

        assertEquals(SignFormGeometry.MAX_FORM_POINTS, points.size());
        double maxZ = points.stream().mapToDouble(p -> p.z - CENTER.z).max().orElse(0.0);
        assertTrue(maxZ > 1.4, "column should project along +Z, reached " + maxZ);
        assertTrue(points.stream().allMatch(p -> Math.abs(p.x - CENTER.x) < 0.6
                && Math.abs(p.y - CENTER.y) < 0.6));
    }

    @Test
    void columnRisesVerticallyForAnUpwardAxis() {
        List<Vec3> points = SignFormGeometry.build(
                SignFormProfile.COLUMN, CENTER, new Vec3(0.0, 1.0, 0.0), 1.0);

        double maxY = points.stream().mapToDouble(p -> p.y - CENTER.y).max().orElse(0.0);
        assertTrue(maxY > 1.4, "column should climb, reached " + maxY);
    }

    @Test
    void orbWrapsTheSealOnAllSides() {
        List<Vec3> points = SignFormGeometry.build(
                SignFormProfile.ORB, CENTER, NORMAL, 1.0);

        assertEquals(SignFormGeometry.MAX_FORM_POINTS, points.size());
        double minY = points.stream().mapToDouble(p -> p.y - CENTER.y).min().orElse(0.0);
        double maxY = points.stream().mapToDouble(p -> p.y - CENTER.y).max().orElse(0.0);
        assertTrue(minY < -0.4 && maxY > 0.4, "orb should extend above and below");
    }

    @Test
    void boltShootsForwardAlongTheFacing() {
        List<Vec3> points = SignFormGeometry.build(
                SignFormProfile.BOLT, CENTER, NORMAL, 1.0);

        assertEquals(SignFormGeometry.MAX_FORM_POINTS, points.size());
        double maxZ = points.stream().mapToDouble(p -> p.z - CENTER.z).max().orElse(0.0);
        assertTrue(maxZ > 2.0, "bolt should travel along +Z, reached " + maxZ);
    }

    @Test
    void volleyFansSeveralStreams() {
        List<Vec3> points = SignFormGeometry.build(
                SignFormProfile.VOLLEY, CENTER, NORMAL, 1.0);

        assertEquals(SignFormGeometry.MAX_FORM_POINTS, points.size());
        double minX = points.stream().mapToDouble(p -> p.x - CENTER.x).min().orElse(0.0);
        double maxX = points.stream().mapToDouble(p -> p.x - CENTER.x).max().orElse(0.0);
        assertTrue(minX < -0.3 && maxX > 0.3, "volley should spread sideways");
    }

    @Test
    void dispersionFillsACloudDeterministically() {
        List<Vec3> first = SignFormGeometry.build(
                SignFormProfile.DISPERSION, CENTER, NORMAL, 1.0);
        List<Vec3> second = SignFormGeometry.build(
                SignFormProfile.DISPERSION, CENTER, NORMAL, 1.0);

        assertEquals(first, second);
        assertTrue(first.stream().allMatch(p -> p.distanceTo(CENTER) <= 1.05));
    }

    @Test
    void everyFormRespectsTheRemainingPointBudget() {
        for (SignFormProfile form : SignFormProfile.values()) {
            List<Vec3> points = SignFormGeometry.build(form, CENTER, NORMAL, 1.8);

            assertTrue(points.size() <= SignFormGeometry.MAX_FORM_POINTS,
                    form + " used " + points.size() + " points");
            int total = 72 + points.size(); // base seal rings use 72 points
            assertTrue(total <= ManifestationGeometry.MAX_POINTS,
                    form + " pushes the plan to " + total);
        }
    }

    @Test
    void planUsesFormGeometryInsteadOfSpokesWhenASignIsPresent() {
        ActivationResult withColumn = new ActivationResult(
                ActivationStatus.SUCCESS,
                "page-1",
                List.of("eau"),
                List.of("colonne"),
                1.0,
                0.9,
                280);

        ManifestationPlan plan = ManifestationPlan.createAnchored(CENTER, NORMAL, withColumn);

        assertEquals(72 + SignFormGeometry.MAX_FORM_POINTS, plan.points().size());
        double maxZ = plan.points().stream()
                .mapToDouble(p -> p.z - CENTER.z)
                .max()
                .orElse(0.0);
        assertTrue(maxZ > 1.4, "column geometry should be part of the plan");
    }

    @Test
    void signImbalanceLeansTheManifestation() {
        ActivationResult neutral = new ActivationResult(
                ActivationStatus.SUCCESS,
                "page-1",
                List.of("eau"),
                List.of("colonne"),
                1.0,
                0.9,
                280);
        ActivationResult tiltedRight = new ActivationResult(
                ActivationStatus.SUCCESS,
                "page-1",
                List.of("eau"),
                List.of("colonne"),
                1.0,
                0.9,
                280,
                1.0,
                0.0,
                0.0);

        ManifestationPlan neutralPlan = ManifestationPlan.createAnchored(CENTER, NORMAL, neutral);
        ManifestationPlan tiltedPlan = ManifestationPlan.createAnchored(CENTER, NORMAL, tiltedRight);

        double neutralMinX = minX(neutralPlan);
        double tiltedMinX = minX(tiltedPlan);
        double neutralMaxZ = neutralPlan.points().stream()
                .mapToDouble(p -> p.z - CENTER.z).max().orElse(0.0);
        double tiltedMaxZ = tiltedPlan.points().stream()
                .mapToDouble(p -> p.z - CENTER.z).max().orElse(0.0);

        assertTrue(Math.abs(tiltedMinX - neutralMinX) > 0.2,
                "the imbalance should shift the column sideways: "
                        + neutralMinX + " vs " + tiltedMinX);
        assertTrue(tiltedMaxZ < neutralMaxZ,
                "the tilted column should trade reach for sideways lean: "
                        + neutralMaxZ + " vs " + tiltedMaxZ);
    }

    private static double minX(ManifestationPlan plan) {
        return plan.points().stream().mapToDouble(p -> p.x - CENTER.x).min().orElse(0.0);
    }
}
