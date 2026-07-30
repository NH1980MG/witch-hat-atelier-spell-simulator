package io.github.nh1980mg.witchhat.magic.spell;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.minecraft.world.phys.Vec3;
import org.junit.jupiter.api.Test;

final class ManifestationGeometryTest {
    @Test
    void createsTheRequestedCircleInThePlanePerpendicularToTheLookDirection() {
        Vec3 center = new Vec3(3.0, 4.0, 5.0);
        Vec3 normal = new Vec3(0.0, 0.0, 1.0);

        List<Vec3> points = ManifestationGeometry.circle(center, normal, 1.25, 16);

        assertEquals(16, points.size());
        for (Vec3 point : points) {
            Vec3 offset = point.subtract(center);
            assertEquals(1.25, offset.length(), 0.000001);
            assertEquals(0.0, offset.dot(normal), 0.000001);
        }
    }

    @Test
    void handlesAVerticalLookDirectionWithoutInvalidCoordinates() {
        List<Vec3> points = ManifestationGeometry.circle(
                Vec3.ZERO, new Vec3(0.0, 1.0, 0.0), 1.0, 12);

        assertTrue(points.stream().allMatch(ManifestationGeometryTest::isFinite));
    }

    @Test
    void normalizesExtremeFiniteDirectionsWithoutDegenerating() {
        List<Vec3> points = ManifestationGeometry.circle(
                Vec3.ZERO,
                new Vec3(Double.MAX_VALUE, Double.MAX_VALUE, 0.0),
                1.0,
                12);

        assertTrue(points.stream().allMatch(ManifestationGeometryTest::isFinite));
        points.forEach(point -> assertEquals(1.0, point.length(), 0.000001));
    }

    @Test
    void interpolatesBoundedLinesIncludingBothEnds() {
        Vec3 start = new Vec3(1.0, 2.0, 3.0);
        Vec3 end = new Vec3(5.0, 6.0, 7.0);

        List<Vec3> points = ManifestationGeometry.line(start, end, 5);

        assertEquals(5, points.size());
        assertEquals(start, points.getFirst());
        assertEquals(end, points.getLast());
    }

    @Test
    void rejectsInvalidOrUnboundedGeometry() {
        assertThrows(IllegalArgumentException.class, () ->
                ManifestationGeometry.circle(Vec3.ZERO, Vec3.ZERO, 1.0, 12));
        assertThrows(IllegalArgumentException.class, () ->
                ManifestationGeometry.circle(
                        Vec3.ZERO, new Vec3(0.0, 0.0, 1.0), -1.0, 12));
        assertThrows(IllegalArgumentException.class, () ->
                ManifestationGeometry.circle(
                        Vec3.ZERO, new Vec3(0.0, 0.0, 1.0), 1.0, 129));
        assertThrows(IllegalArgumentException.class, () ->
                ManifestationGeometry.line(
                        Vec3.ZERO, new Vec3(1.0, 0.0, 0.0), 1));
        assertThrows(IllegalArgumentException.class, () ->
                ManifestationGeometry.circle(
                        new Vec3(Double.MAX_VALUE, 0.0, 0.0),
                        new Vec3(0.0, 0.0, 1.0),
                        Double.MAX_VALUE,
                        12));
        assertThrows(IllegalArgumentException.class, () ->
                ManifestationGeometry.line(
                        new Vec3(Double.MAX_VALUE, 0.0, 0.0),
                        new Vec3(-Double.MAX_VALUE, 0.0, 0.0),
                        3));
    }

    private static boolean isFinite(Vec3 point) {
        return Double.isFinite(point.x)
                && Double.isFinite(point.y)
                && Double.isFinite(point.z);
    }
}
