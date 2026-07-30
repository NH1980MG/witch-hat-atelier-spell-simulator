package io.github.nh1980mg.witchhat.magic.spell;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.world.phys.Vec3;
import org.junit.jupiter.api.Test;

final class ManifestationSchedulerTest {
    @Test
    void drainsEveryPointOverTheRequestedDuration() {
        ManifestationScheduler scheduler = new ManifestationScheduler();
        List<Vec3> emitted = new ArrayList<>();
        scheduler.enqueue(plan(), 10, emitted::add);

        for (int tick = 0; tick < 10; tick++) {
            scheduler.tick();
        }

        assertEquals(104, emitted.size());
        assertEquals(0, scheduler.pendingCount());
    }

    @Test
    void emitsSteadySlicesEachTick() {
        ManifestationScheduler scheduler = new ManifestationScheduler();
        List<Integer> slices = new ArrayList<>();
        List<Vec3> emitted = new ArrayList<>();
        scheduler.enqueue(plan(), 8, point -> emitted.add(point));

        for (int tick = 0; tick < 8; tick++) {
            int before = emitted.size();
            scheduler.tick();
            slices.add(emitted.size() - before);
        }

        assertEquals(104, emitted.size());
        assertTrue(slices.stream().allMatch(count -> count >= 12 && count <= 14),
                "slices should be steady around 13 points: " + slices);
    }

    @Test
    void burstsEverythingWhenTheDurationIsZero() {
        ManifestationScheduler scheduler = new ManifestationScheduler();
        List<Vec3> emitted = new ArrayList<>();
        scheduler.enqueue(plan(), 0, emitted::add);

        scheduler.tick();

        assertEquals(104, emitted.size());
        assertEquals(0, scheduler.pendingCount());
    }

    private static ManifestationPlan plan() {
        return ManifestationPlan.createAnchored(
                Vec3.ZERO,
                new Vec3(0.0, 1.0, 0.0),
                new ActivationResult(
                        ActivationStatus.SUCCESS,
                        "page-1",
                        List.of("eau"),
                        List.of(),
                        1.0,
                        1.0,
                        300));
    }
}
