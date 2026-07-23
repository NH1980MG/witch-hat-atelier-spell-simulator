package io.github.nh1980mg.witchhat.aibuilder.plan;

import java.util.List;
import java.util.Map;

public record BuildPlan(
        int formatVersion,
        String id,
        PlanDimensions dimensions,
        Map<String, String> palette,
        List<PlanPhase> phases) {
    public BuildPlan {
        palette = Map.copyOf(palette);
        phases = List.copyOf(phases);
    }

    public int placementCount() {
        return phases.stream().mapToInt(phase -> phase.placements().size()).sum();
    }
}
