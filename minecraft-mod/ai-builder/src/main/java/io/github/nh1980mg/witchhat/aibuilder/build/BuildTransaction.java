package io.github.nh1980mg.witchhat.aibuilder.build;

import java.util.List;

public record BuildTransaction(
        int formatVersion,
        String transactionId,
        String dimension,
        int appliedCount,
        List<Entry> entries) {
    public BuildTransaction {
        entries = List.copyOf(entries);
    }

    public BuildTransaction withAppliedCount(int count) {
        return new BuildTransaction(formatVersion, transactionId, dimension, count, entries);
    }

    public record Entry(int x, int y, int z, String state, String targetState) {
    }
}
