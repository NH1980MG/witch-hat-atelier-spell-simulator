package io.github.nh1980mg.witchhat.magic.block;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.List;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import org.junit.jupiter.api.Test;

final class CanvasMultiblockTest {
    private static final BlockPos MASTER = new BlockPos(10, 64, -5);

    @Test
    void laysOutThreeDistinctPartCellsForEveryFacing() {
        for (Direction facing : Direction.Plane.HORIZONTAL) {
            List<BlockPos> parts = CanvasMultiblock.partPositions(MASTER, facing);

            assertEquals(3, parts.size());
            assertEquals(3, new HashSet<>(parts).size());
            assertTrue(parts.stream().noneMatch(MASTER::equals));
        }
    }

    @Test
    void roundTripsMasterPositionsForEveryPartAndFacing() {
        for (Direction facing : Direction.Plane.HORIZONTAL) {
            List<BlockPos> parts = CanvasMultiblock.partPositions(MASTER, facing);
            for (int index = 0; index < parts.size(); index++) {
                assertEquals(
                        MASTER,
                        CanvasMultiblock.masterFromPart(parts.get(index), facing, index),
                        "facing " + facing + " part " + index);
            }
        }
    }

    @Test
    void identifiesPartIndicesAndRejectsForeignPositions() {
        for (Direction facing : Direction.Plane.HORIZONTAL) {
            List<BlockPos> parts = CanvasMultiblock.partPositions(MASTER, facing);
            for (int index = 0; index < parts.size(); index++) {
                assertEquals(index, CanvasMultiblock.partIndex(MASTER, facing, parts.get(index)));
            }
            assertEquals(-1, CanvasMultiblock.partIndex(MASTER, facing, MASTER));
            assertEquals(-1, CanvasMultiblock.partIndex(
                    MASTER, facing, MASTER.relative(facing.getOpposite(), 3)));
        }
    }
}
