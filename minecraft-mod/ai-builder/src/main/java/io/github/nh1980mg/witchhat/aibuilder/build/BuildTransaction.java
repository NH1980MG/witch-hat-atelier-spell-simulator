package io.github.nh1980mg.witchhat.aibuilder.build;

import java.util.List;

public record BuildTransaction(
        int formatVersion,
        String transactionId,
        String dimension,
        List<Entry> entries) {
    public BuildTransaction {
        entries = List.copyOf(entries);
    }

    public record Entry(int x, int y, int z, String state) {
    }
}
