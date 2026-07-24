package io.github.nh1980mg.witchhat.aibuilder.build;

import java.util.List;

public final class BuildSession {
    private final String planId;
    private final List<ResolvedPlacement> placements;
    private final int blocksPerTick;
    private final WorldMutationPort world;
    private BuildState state = BuildState.RUNNING;
    private int cursor;

    public BuildSession(
            String planId,
            List<ResolvedPlacement> placements,
            int blocksPerTick,
            WorldMutationPort world) {
        this.planId = planId;
        this.placements = List.copyOf(placements);
        this.blocksPerTick = blocksPerTick;
        this.world = world;
    }

    public void tick() {
        if (state != BuildState.RUNNING) {
            return;
        }
        int stop = Math.min(cursor + blocksPerTick, placements.size());
        try {
            while (cursor < stop) {
                ResolvedPlacement placement = placements.get(cursor);
                if (world.isProtected(placement)) {
                    state = BuildState.FAILED;
                    return;
                }
                world.setBlockState(placement, placement.targetState());
                cursor++;
            }
            if (cursor == placements.size()) {
                state = BuildState.COMPLETE;
            }
        } catch (RuntimeException error) {
            state = BuildState.FAILED;
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
