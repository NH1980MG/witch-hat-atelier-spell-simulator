package io.github.nh1980mg.witchhat.aibuilder.fabric;

import io.github.nh1980mg.witchhat.aibuilder.build.ResolvedPlacement;
import java.util.List;
import net.minecraft.server.level.ServerPlayer;

@FunctionalInterface
public interface PreviewPublisher {
    void send(ServerPlayer player, String planId, List<ResolvedPlacement> placements);

    static PreviewPublisher noop() {
        return (player, planId, placements) -> {
        };
    }
}
