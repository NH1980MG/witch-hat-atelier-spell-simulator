package io.github.nh1980mg.witchhat.aibuilder.build;

import java.util.List;
import java.util.function.IntConsumer;

public final class BuildSession {
    private final String planId;
    private final List<ResolvedPlacement> placements;
    private final int blocksPerTick;
    private final WorldMutationPort world;
    private final IntConsumer progressRecorder;
    private BuildState state = BuildState.RUNNING;
    private int cursor;

    public BuildSession(
            String planId,
            List<ResolvedPlacement> placements,
            int blocksPerTick,
            WorldMutationPort world,
            IntConsumer progressRecorder) {
        this.planId = planId;
        this.placements = List.copyOf(placements);
        this.blocksPerTick = blocksPerTick;
        this.world = world;
        this.progressRecorder = progressRecorder;
    }

    public void tick() {
        if (state != BuildState.RUNNING) {
            return;
        }
        int stop = Math.min(cursor + blocksPerTick, placements.size());
        try {
            // Write-ahead progress makes the current batch recoverable after a crash.
            progressRecorder.accept(stop);
        } catch (RuntimeException error) {
            state = BuildState.FAILED;
            return;
        }
        try {
            while (cursor < stop) {
                ResolvedPlacement placement = placements.get(cursor);
                if (world.isProtected(placement)) {
                    state = BuildState.FAILED;
                    return;
                }
                if (!world.setBlockState(placement, placement.targetState())) {
                    state = BuildState.FAILED;
                    return;
                }
                cursor++;
            }
            if (cursor == placements.size()) {
                state = BuildState.COMPLETE;
            }
        } catch (RuntimeException error) {
            state = BuildState.FAILED;
        } finally {
            if (cursor != stop) {
                try {
                    progressRecorder.accept(cursor);
                } catch (RuntimeException error) {
                    state = BuildState.FAILED;
                }
            }
        }
    }

    public boolean pause() {
        if (state != BuildState.RUNNING) {
            return false;
        }
        state = BuildState.PAUSED;
        return true;
    }

    public boolean resume() {
        if (state != BuildState.PAUSED) {
            return false;
        }
        state = BuildState.RUNNING;
        return true;
    }

    public boolean cancel() {
        if (state != BuildState.RUNNING && state != BuildState.PAUSED) {
            return false;
        }
        state = BuildState.CANCELLED;
        return true;
    }

    public BuildStatus status() {
        String phase = cursor < placements.size()
                ? placements.get(cursor).phase()
                : placements.isEmpty() ? "" : placements.getLast().phase();
        return new BuildStatus(state, planId, cursor, placements.size(), phase);
    }

    public boolean isActive() {
        return state == BuildState.RUNNING || state == BuildState.PAUSED;
    }

    public record BuildStatus(
            BuildState state,
            String planId,
            int placedCount,
            int totalCount,
            String phase) {
        public static BuildStatus idle() {
            return new BuildStatus(BuildState.IDLE, "", 0, 0, "");
        }
    }
}
