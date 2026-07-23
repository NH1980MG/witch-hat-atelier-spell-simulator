package io.github.nh1980mg.witchhat.aibuilder.build;

public record ResolvedPlacement(
        String dimension,
        String phase,
        int x,
        int y,
        int z,
        String targetState) {
}
