package io.github.nh1980mg.witchhat.magic.blockentity;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

final class CanvasDurabilityTest {
    @Test
    void costsAtLeastOneActivationPerCast() {
        assertEquals(1, CanvasBlockEntity.activationCost(0.5));
        assertEquals(1, CanvasBlockEntity.activationCost(1.0));
    }

    @Test
    void strongerSpellsConsumeMoreDurability() {
        assertEquals(2, CanvasBlockEntity.activationCost(1.5));
        assertEquals(2, CanvasBlockEntity.activationCost(1.01));
        assertEquals(3, CanvasBlockEntity.activationCost(3.0));
    }
}
