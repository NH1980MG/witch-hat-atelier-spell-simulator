package io.github.nh1980mg.witchhat.magic.block;

import java.util.List;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;

/**
 * Pure 2x2 multiblock geometry: the master cell plus three part cells laid
 * out along the master facing and its clockwise direction. Stateless — part
 * blocks encode FACING + PART_INDEX in their blockstate and recompute the
 * master position from this arithmetic.
 */
public final class CanvasMultiblock {
    public static final int PART_COUNT = 3;

    private CanvasMultiblock() {}

    public static List<BlockPos> partPositions(BlockPos master, Direction facing) {
        Direction right = facing.getClockWise();
        return List.of(
                master.relative(right),
                master.relative(facing),
                master.relative(right).relative(facing));
    }

    public static int partIndex(BlockPos master, Direction facing, BlockPos part) {
        List<BlockPos> parts = partPositions(master, facing);
        for (int index = 0; index < parts.size(); index++) {
            if (parts.get(index).equals(part)) {
                return index;
            }
        }
        return -1;
    }

    public static BlockPos masterFromPart(BlockPos part, Direction facing, int partIndex) {
        Direction right = facing.getClockWise();
        return switch (partIndex) {
            case 0 -> part.relative(right.getOpposite());
            case 1 -> part.relative(facing.getOpposite());
            case 2 -> part.relative(right.getOpposite()).relative(facing.getOpposite());
            default -> throw new IllegalArgumentException("Invalid canvas part index: " + partIndex);
        };
    }
}
