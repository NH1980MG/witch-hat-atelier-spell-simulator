package io.github.nh1980mg.witchhat.aibuilder;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class AiBuilderBootstrapTest {
    @Test
    void exposesStableModId() {
        assertEquals("witchhat_ai_builder", AiBuilderMod.MOD_ID);
    }
}
