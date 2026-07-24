package io.github.nh1980mg.witchhat.aibuilder.fabric;

import com.mojang.brigadier.exceptions.CommandSyntaxException;
import io.github.nh1980mg.witchhat.aibuilder.build.ResolvedPlacement;
import io.github.nh1980mg.witchhat.aibuilder.build.WorldMutationPort;
import io.github.nh1980mg.witchhat.aibuilder.preview.PreviewStatus;
import java.util.Set;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;

public final class MinecraftWorldMutationPort implements WorldMutationPort {
    private final MinecraftServer server;
    private final Set<String> protectedBlocks;

    public MinecraftWorldMutationPort(MinecraftServer server, Set<String> protectedBlocks) {
        this.server = server;
        this.protectedBlocks = Set.copyOf(protectedBlocks);
    }

    @Override
    public String getBlockState(ResolvedPlacement placement) {
        return BlockStateParser.serialize(level(placement).getBlockState(position(placement)));
    }

    @Override
    public void setBlockState(ResolvedPlacement placement, String blockState) {
        try {
            BlockState parsed = BlockStateParser.parseForBlock(
                    server.registryAccess().lookupOrThrow(Registries.BLOCK),
                    blockState,
                    false).blockState();
            level(placement).setBlock(position(placement), parsed, Block.UPDATE_ALL);
        } catch (CommandSyntaxException error) {
            throw new IllegalArgumentException("Invalid block state: " + blockState, error);
        }
    }

    @Override
    public boolean isProtected(ResolvedPlacement placement) {
        BlockState state = level(placement).getBlockState(position(placement));
        return protectedBlocks.contains(BuiltInRegistries.BLOCK.getKey(state.getBlock()).toString());
    }

    public PreviewStatus previewStatus(ResolvedPlacement placement) {
        if (isProtected(placement)) {
            return PreviewStatus.PROTECTED;
        }
        return level(placement).getBlockState(position(placement)).isAir()
                ? PreviewStatus.REPLACEABLE
                : PreviewStatus.OCCUPIED;
    }

    private ServerLevel level(ResolvedPlacement placement) {
        ResourceKey<Level> key = ResourceKey.create(
                Registries.DIMENSION,
                ResourceLocation.parse(placement.dimension()));
        ServerLevel level = server.getLevel(key);
        if (level == null) {
            throw new IllegalArgumentException("Unknown dimension: " + placement.dimension());
        }
        return level;
    }

    private static BlockPos position(ResolvedPlacement placement) {
        return new BlockPos(placement.x(), placement.y(), placement.z());
    }
}
