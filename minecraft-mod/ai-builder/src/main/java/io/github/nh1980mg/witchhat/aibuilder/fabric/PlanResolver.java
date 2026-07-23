package io.github.nh1980mg.witchhat.aibuilder.fabric;

import io.github.nh1980mg.witchhat.aibuilder.build.ResolvedPlacement;
import io.github.nh1980mg.witchhat.aibuilder.config.AiBuilderConfig;
import io.github.nh1980mg.witchhat.aibuilder.plan.BuildPlan;
import io.github.nh1980mg.witchhat.aibuilder.plan.PlanPhase;
import io.github.nh1980mg.witchhat.aibuilder.plan.PlanPlacement;
import io.github.nh1980mg.witchhat.aibuilder.plan.PlanValidationException;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;

public final class PlanResolver {
    private final AiBuilderConfig config;

    public PlanResolver(AiBuilderConfig config) {
        this.config = config;
    }

    public List<ResolvedPlacement> resolve(BuildPlan plan, ServerPlayer player) {
        Direction facing = player.getDirection();
        BlockPos origin = player.blockPosition().relative(facing, 2);
        String dimension = player.serverLevel().dimension().location().toString();
        List<ResolvedPlacement> resolved = new ArrayList<>(plan.placementCount());

        for (PlanPhase phase : plan.phases()) {
            for (PlanPlacement placement : phase.placements()) {
                String blockId = plan.palette().get(placement.blockKey());
                ResourceLocation blockKey = ResourceLocation.tryParse(blockId);
                if (blockKey == null || !BuiltInRegistries.BLOCK.containsKey(blockKey)) {
                    throw new PlanValidationException("Unknown Minecraft block: " + blockId);
                }
                if (config.protectedBlocks().contains(blockId)) {
                    throw new PlanValidationException("Protected block cannot be placed: " + blockId);
                }
                BlockPos worldPosition = rotate(origin, placement, facing);
                if (player.distanceToSqr(
                        worldPosition.getX() + 0.5,
                        worldPosition.getY() + 0.5,
                        worldPosition.getZ() + 0.5)
                        > (double) config.maxDistance() * config.maxDistance()) {
                    throw new PlanValidationException(
                            "Plan exceeds maximum player distance of " + config.maxDistance());
                }
                resolved.add(new ResolvedPlacement(
                        dimension,
                        phase.name(),
                        worldPosition.getX(),
                        worldPosition.getY(),
                        worldPosition.getZ(),
                        blockId));
            }
        }
        return List.copyOf(resolved);
    }

    private static BlockPos rotate(
            BlockPos origin,
            PlanPlacement placement,
            Direction facing) {
        int x = placement.x();
        int z = placement.z();
        return switch (facing) {
            case NORTH -> origin.offset(x, placement.y(), -z);
            case EAST -> origin.offset(z, placement.y(), x);
            case SOUTH -> origin.offset(-x, placement.y(), z);
            case WEST -> origin.offset(-z, placement.y(), -x);
            default -> throw new IllegalArgumentException("Player direction must be horizontal");
        };
    }
}
