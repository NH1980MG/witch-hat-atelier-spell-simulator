package io.github.nh1980mg.witchhat.aibuilder.preview;

import java.util.List;

public final class PreviewState {
    private final int maxPlacements;
    private Snapshot snapshot = Snapshot.empty();

    public PreviewState(int maxPlacements) {
        if (maxPlacements < 1) {
            throw new IllegalArgumentException("Preview limit must be positive");
        }
        this.maxPlacements = maxPlacements;
    }

    public synchronized void replace(
            String planId,
            String dimension,
            long expiresAt,
            List<PreviewPlacement> placements) {
        if (placements.size() > maxPlacements) {
            throw new IllegalArgumentException(
                    "Preview exceeds placement limit of " + maxPlacements);
        }
        snapshot = new Snapshot(planId, dimension, expiresAt, List.copyOf(placements));
    }

    public synchronized void expire(long currentTick) {
        if (!snapshot.placements().isEmpty() && currentTick >= snapshot.expiresAt()) {
            snapshot = Snapshot.empty();
        }
    }

    public synchronized void clear() {
        snapshot = Snapshot.empty();
    }

    public synchronized Snapshot snapshot() {
        return snapshot;
    }

    public record Snapshot(
            String planId,
            String dimension,
            long expiresAt,
            List<PreviewPlacement> placements) {
        public Snapshot {
            placements = List.copyOf(placements);
        }

        private static Snapshot empty() {
            return new Snapshot("", "", 0, List.of());
        }
    }
}
