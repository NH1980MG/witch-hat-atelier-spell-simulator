package io.github.nh1980mg.witchhat.aibuilder.plan;

import java.util.List;

public record PlanPhase(String name, List<PlanPlacement> placements) {
    public PlanPhase {
        placements = List.copyOf(placements);
    }
}
