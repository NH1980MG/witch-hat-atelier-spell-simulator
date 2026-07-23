package io.github.nh1980mg.witchhat.aibuilder.plan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.StringReader;
import org.junit.jupiter.api.Test;

class PlanParserTest {
    private static final String VALID = """
            {
              "formatVersion": 1,
              "id": "test_platform",
              "dimensions": {"x": 3, "y": 1, "z": 3},
              "palette": {
                "floor": "minecraft:stone",
                "light": "minecraft:sea_lantern"
              },
              "phases": [{
                "name": "foundation",
                "placements": [
                  {"x": 0, "y": 0, "z": 0, "block": "floor"},
                  {"x": 1, "y": 0, "z": 0, "block": "light"}
                ]
              }]
            }
            """;

    private final PlanParser parser = new PlanParser();

    @Test
    void parsesValidPhasedPlan() {
        BuildPlan plan = parser.parse(new StringReader(VALID), PlanLimits.defaults());

        assertEquals("test_platform", plan.id());
        assertEquals(2, plan.placementCount());
        assertEquals("foundation", plan.phases().getFirst().name());
    }

    @Test
    void rejectsUnknownPaletteKey() {
        assertInvalid(VALID.replace("\"light\"}", "\"missing\"}"), "Unknown palette key");
    }

    @Test
    void rejectsDuplicatePositions() {
        assertInvalid(VALID.replace(
                "{\"x\": 1, \"y\": 0, \"z\": 0, \"block\": \"light\"}",
                "{\"x\": 0, \"y\": 0, \"z\": 0, \"block\": \"light\"}"),
                "Duplicate placement");
    }

    @Test
    void rejectsOutOfBoundsCoordinates() {
        assertInvalid(VALID.replace("\"x\": 1, \"y\": 0", "\"x\": 3, \"y\": 0"), "outside dimensions");
    }

    @Test
    void rejectsOversizedDimensions() {
        assertInvalid(VALID.replace("\"x\": 3", "\"x\": 257"), "exceeds limit");
    }

    @Test
    void rejectsTooManyPlacements() {
        PlanLimits onePlacement = new PlanLimits(1, 256);
        PlanValidationException error = assertThrows(
                PlanValidationException.class,
                () -> parser.parse(new StringReader(VALID), onePlacement));
        assertEquals("Plan exceeds placement limit of 1", error.getMessage());
    }

    private void assertInvalid(String json, String expectedMessageFragment) {
        PlanValidationException error = assertThrows(
                PlanValidationException.class,
                () -> parser.parse(new StringReader(json), PlanLimits.defaults()));
        org.junit.jupiter.api.Assertions.assertTrue(
                error.getMessage().contains(expectedMessageFragment),
                () -> "Expected message containing '" + expectedMessageFragment + "' but got: " + error.getMessage());
    }
}
