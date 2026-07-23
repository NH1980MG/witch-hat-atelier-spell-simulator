package io.github.nh1980mg.witchhat.aibuilder.plan;

public record PlanLimits(int maxPlacements, int maxDimension) {
    public PlanLimits {
        if (maxPlacements < 1 || maxDimension < 1) {
            throw new IllegalArgumentException("Plan limits must be positive");
        }
    }

    public static PlanLimits defaults() {
        return new PlanLimits(50_000, 256);
    }
}
