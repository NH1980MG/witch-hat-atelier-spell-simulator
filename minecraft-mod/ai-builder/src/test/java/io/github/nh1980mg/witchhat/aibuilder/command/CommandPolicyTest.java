package io.github.nh1980mg.witchhat.aibuilder.command;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class CommandPolicyTest {
    @Test
    void mutationRequiresOperatorAndCreativePlayer() {
        assertFalse(CommandPolicy.canMutate(1, true));
        assertFalse(CommandPolicy.canMutate(2, false));
        assertTrue(CommandPolicy.canMutate(2, true));
    }
}
