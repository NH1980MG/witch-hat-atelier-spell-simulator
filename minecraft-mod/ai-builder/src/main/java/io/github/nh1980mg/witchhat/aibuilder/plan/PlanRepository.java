package io.github.nh1980mg.witchhat.aibuilder.plan;

import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public final class PlanRepository {
    private final Path root;
    private final PlanParser parser;

    public PlanRepository(Path root, PlanParser parser) {
        this.root = root.toAbsolutePath().normalize();
        this.parser = parser;
    }

    public List<String> listPlanIds() {
        try {
            Files.createDirectories(root);
            try (var files = Files.list(root)) {
                return files
                        .filter(Files::isRegularFile)
                        .map(path -> path.getFileName().toString())
                        .filter(name -> name.endsWith(".json"))
                        .map(name -> name.substring(0, name.length() - ".json".length()))
                        .filter(id -> {
                            try {
                                PlanParser.requireId(id);
                                return true;
                            } catch (PlanValidationException ignored) {
                                return false;
                            }
                        })
                        .sorted()
                        .toList();
            }
        } catch (IOException error) {
            throw new PlanValidationException("Unable to list plans", error);
        }
    }

    public BuildPlan load(String id, PlanLimits limits) {
        PlanParser.requireId(id);
        Path file = root.resolve(id + ".json").normalize();
        if (!file.startsWith(root)) {
            throw new PlanValidationException("Plan path escapes the plans directory");
        }
        if (!Files.isRegularFile(file)) {
            throw new PlanValidationException("Plan does not exist: " + id);
        }
        try (Reader reader = Files.newBufferedReader(file)) {
            BuildPlan plan = parser.parse(reader, limits);
            if (!id.equals(plan.id())) {
                throw new PlanValidationException("Plan id does not match filename: " + id);
            }
            return plan;
        } catch (IOException error) {
            throw new PlanValidationException("Unable to read plan: " + id, error);
        }
    }
}
