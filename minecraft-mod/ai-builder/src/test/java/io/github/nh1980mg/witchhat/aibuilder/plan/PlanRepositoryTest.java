package io.github.nh1980mg.witchhat.aibuilder.plan;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class PlanRepositoryTest {
    @TempDir
    Path tempDir;

    @Test
    void listsOnlyValidPlanFilesInSortedOrder() throws Exception {
        Files.writeString(tempDir.resolve("zeta.json"), validPlan("zeta"));
        Files.writeString(tempDir.resolve("alpha.json"), validPlan("alpha"));
        Files.writeString(tempDir.resolve("notes.txt"), "ignored");

        PlanRepository repository = new PlanRepository(tempDir, new PlanParser());

        assertEquals(List.of("alpha", "zeta"), repository.listPlanIds());
        assertEquals("alpha", repository.load("alpha", PlanLimits.defaults()).id());
    }

    @Test
    void rejectsTraversalIds() {
        PlanRepository repository = new PlanRepository(tempDir, new PlanParser());

        assertThrows(
                PlanValidationException.class,
                () -> repository.load("../outside", PlanLimits.defaults()));
    }

    private static String validPlan(String id) {
        return """
                {
                  "formatVersion": 1,
                  "id": "%s",
                  "dimensions": {"x": 1, "y": 1, "z": 1},
                  "palette": {"floor": "minecraft:stone"},
                  "phases": [{
                    "name": "foundation",
                    "placements": [{"x": 0, "y": 0, "z": 0, "block": "floor"}]
                  }]
                }
                """.formatted(id);
    }
}
