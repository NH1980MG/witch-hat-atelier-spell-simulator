package io.github.nh1980mg.witchhat.aibuilder.preview;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class PreviewStateTest {
    @Test
    void replacesAtomicallyAndClears() {
        PreviewState state = new PreviewState(50_000);
        state.replace(
                "first",
                "minecraft:overworld",
                100,
                List.of(new PreviewPlacement(1, 2, 3, PreviewStatus.REPLACEABLE)));
        state.replace(
                "second",
                "minecraft:overworld",
                200,
                List.of(new PreviewPlacement(4, 5, 6, PreviewStatus.OCCUPIED)));

        assertEquals("second", state.snapshot().planId());
        assertEquals(1, state.snapshot().placements().size());
        state.clear();
        assertTrue(state.snapshot().placements().isEmpty());
    }

    @Test
    void expiresAndRejectsOversizedPayload() {
        PreviewState state = new PreviewState(2);
        state.replace(
                "expiring",
                "minecraft:overworld",
                10,
                List.of(new PreviewPlacement(1, 2, 3, PreviewStatus.REPLACEABLE)));
        state.expire(10);
        assertTrue(state.snapshot().placements().isEmpty());

        List<PreviewPlacement> oversized = new ArrayList<>();
        oversized.add(new PreviewPlacement(0, 0, 0, PreviewStatus.REPLACEABLE));
        oversized.add(new PreviewPlacement(1, 0, 0, PreviewStatus.REPLACEABLE));
        oversized.add(new PreviewPlacement(2, 0, 0, PreviewStatus.REPLACEABLE));
        assertThrows(
                IllegalArgumentException.class,
                () -> state.replace("large", "minecraft:overworld", 20, oversized));
    }
}
