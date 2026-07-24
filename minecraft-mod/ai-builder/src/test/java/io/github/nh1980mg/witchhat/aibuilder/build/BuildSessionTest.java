package io.github.nh1980mg.witchhat.aibuilder.build;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class BuildSessionTest {
    @TempDir
    Path tempDir;

    @Test
    void progressesInOrderWithinPerTickLimit() {
        FakeWorld world = new FakeWorld();
        BuildManager manager = manager(world);
        manager.start("ordered", placements(5), 2);

        manager.tick();
        assertEquals(List.of("target-0", "target-1"), world.appliedStates);
        assertEquals(2, manager.status().placedCount());

        manager.tick();
        manager.tick();
        assertEquals(List.of("target-0", "target-1", "target-2", "target-3", "target-4"), world.appliedStates);
        assertEquals(BuildState.COMPLETE, manager.status().state());
    }

    @Test
    void pausesResumesAndCancelsWithoutLosingCursor() {
        FakeWorld world = new FakeWorld();
        BuildManager manager = manager(world);
        manager.start("control", placements(4), 1);
        manager.tick();

        assertTrue(manager.pause());
        manager.tick();
        assertEquals(1, world.appliedStates.size());
        assertTrue(manager.resume());
        manager.tick();
        assertEquals("target-1", world.appliedStates.getLast());
        assertTrue(manager.cancel());
        manager.tick();
        assertEquals(2, world.appliedStates.size());
        assertEquals(BuildState.CANCELLED, manager.status().state());
    }

    @Test
    void rejectsConcurrentAndProtectedBuilds() {
        FakeWorld world = new FakeWorld();
        BuildManager manager = manager(world);
        manager.start("first", placements(2), 1);
        assertThrows(IllegalStateException.class, () -> manager.start("second", placements(1), 1));

        FakeWorld protectedWorld = new FakeWorld();
        protectedWorld.protectedX = 1;
        BuildManager protectedManager = manager(protectedWorld);
        assertThrows(
                IllegalArgumentException.class,
                () -> protectedManager.start("protected", placements(2), 1));
        assertTrue(protectedWorld.appliedStates.isEmpty());
    }

    @Test
    void undoRestoresOriginalStatesInReverseOrder() {
        FakeWorld world = new FakeWorld();
        world.states.put(0, "original-0");
        world.states.put(1, "original-1");
        BuildManager manager = manager(world);
        manager.start("undoable", placements(2), 2);
        manager.tick();

        assertTrue(manager.undo());
        assertEquals(List.of("target-0", "target-1", "original-1", "original-0"), world.appliedStates);
        assertFalse(manager.undo());
    }

    @Test
    void undoAfterCancellationLeavesUnprocessedDestinationsUntouched() {
        FakeWorld world = new FakeWorld();
        BuildManager manager = manager(world);
        manager.start("partial", placements(3), 1);
        manager.tick();
        manager.cancel();
        world.states.put(2, "player-change");

        assertTrue(manager.undo());
        assertEquals("player-change", world.states.get(2));
        assertEquals("minecraft:air", world.states.get(0));
    }

    @Test
    void rejectedWorldMutationFailsWithoutAdvancingCursor() {
        FakeWorld world = new FakeWorld();
        world.rejectedX = 1;
        BuildManager manager = manager(world);
        manager.start("rejected", placements(2), 2);

        manager.tick();

        assertEquals(BuildState.FAILED, manager.status().state());
        assertEquals(1, manager.status().placedCount());
        assertEquals(List.of("target-0"), world.appliedStates);
    }

    private BuildManager manager(FakeWorld world) {
        return new BuildManager(world, new TransactionStore(tempDir.resolve("latest.json")));
    }

    private static List<ResolvedPlacement> placements(int count) {
        List<ResolvedPlacement> placements = new ArrayList<>();
        for (int x = 0; x < count; x++) {
            placements.add(new ResolvedPlacement(
                    "minecraft:overworld", "phase-" + (x / 2), x, 64, 0, "target-" + x));
        }
        return placements;
    }

    private static final class FakeWorld implements WorldMutationPort {
        private final Map<Integer, String> states = new HashMap<>();
        private final List<String> appliedStates = new ArrayList<>();
        private int protectedX = -1;
        private int rejectedX = -1;

        @Override
        public String getBlockState(ResolvedPlacement placement) {
            return states.getOrDefault(placement.x(), "minecraft:air");
        }

        @Override
        public boolean setBlockState(ResolvedPlacement placement, String blockState) {
            if (placement.x() == rejectedX) {
                return false;
            }
            states.put(placement.x(), blockState);
            appliedStates.add(blockState);
            return true;
        }

        @Override
        public boolean isProtected(ResolvedPlacement placement) {
            return placement.x() == protectedX;
        }
    }
}
