package io.github.nh1980mg.witchhat.aibuilder.plan;

import com.google.gson.Gson;
import com.google.gson.JsonParseException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

public final class PlanParser {
    private static final Pattern ID = Pattern.compile("[a-z0-9][a-z0-9_-]{0,63}");
    private static final Pattern BLOCK_ID = Pattern.compile("[a-z0-9_.-]+:[a-z0-9_./-]+");
    private final Gson gson = new Gson();

    public BuildPlan parse(Reader reader, PlanLimits limits) {
        final RawPlan raw;
        try {
            raw = gson.fromJson(reader, RawPlan.class);
        } catch (JsonParseException error) {
            throw new PlanValidationException("Plan is not valid JSON", error);
        }
        if (raw == null) {
            throw new PlanValidationException("Plan document is empty");
        }
        if (raw.formatVersion != 1) {
            throw new PlanValidationException("Unsupported formatVersion: " + raw.formatVersion);
        }
        requireId(raw.id);
        validateDimensions(raw.dimensions, limits);
        Map<String, String> palette = validatePalette(raw.palette);
        List<PlanPhase> phases = validatePhases(raw, palette, limits);
        return new BuildPlan(
                raw.formatVersion,
                raw.id,
                new PlanDimensions(raw.dimensions.x, raw.dimensions.y, raw.dimensions.z),
                palette,
                phases);
    }

    public static void requireId(String id) {
        if (id == null || !ID.matcher(id).matches()) {
            throw new PlanValidationException("Invalid plan id");
        }
    }

    private static void validateDimensions(RawDimensions dimensions, PlanLimits limits) {
        if (dimensions == null || dimensions.x < 1 || dimensions.y < 1 || dimensions.z < 1) {
            throw new PlanValidationException("Plan dimensions must be positive");
        }
        if (dimensions.x > limits.maxDimension()
                || dimensions.y > limits.maxDimension()
                || dimensions.z > limits.maxDimension()) {
            throw new PlanValidationException(
                    "Plan dimension exceeds limit of " + limits.maxDimension());
        }
    }

    private static Map<String, String> validatePalette(Map<String, String> rawPalette) {
        if (rawPalette == null || rawPalette.isEmpty()) {
            throw new PlanValidationException("Plan palette must not be empty");
        }
        Map<String, String> palette = new LinkedHashMap<>();
        rawPalette.forEach((key, blockId) -> {
            if (key == null || !ID.matcher(key).matches()) {
                throw new PlanValidationException("Invalid palette key: " + key);
            }
            if (blockId == null || !BLOCK_ID.matcher(blockId).matches()) {
                throw new PlanValidationException("Invalid block identifier for palette key: " + key);
            }
            palette.put(key, blockId);
        });
        return palette;
    }

    private static List<PlanPhase> validatePhases(
            RawPlan raw,
            Map<String, String> palette,
            PlanLimits limits) {
        if (raw.phases == null || raw.phases.isEmpty()) {
            throw new PlanValidationException("Plan phases must not be empty");
        }
        List<PlanPhase> phases = new ArrayList<>();
        Set<Position> occupied = new HashSet<>();
        int count = 0;
        for (RawPhase phase : raw.phases) {
            if (phase == null || phase.name == null || phase.name.isBlank()) {
                throw new PlanValidationException("Phase name must not be blank");
            }
            if (phase.placements == null || phase.placements.isEmpty()) {
                throw new PlanValidationException("Phase placements must not be empty: " + phase.name);
            }
            List<PlanPlacement> placements = new ArrayList<>();
            for (RawPlacement placement : phase.placements) {
                if (placement == null) {
                    throw new PlanValidationException("Placement must not be null");
                }
                if (placement.x < 0 || placement.x >= raw.dimensions.x
                        || placement.y < 0 || placement.y >= raw.dimensions.y
                        || placement.z < 0 || placement.z >= raw.dimensions.z) {
                    throw new PlanValidationException("Placement is outside dimensions");
                }
                if (!palette.containsKey(placement.block)) {
                    throw new PlanValidationException("Unknown palette key: " + placement.block);
                }
                Position position = new Position(placement.x, placement.y, placement.z);
                if (!occupied.add(position)) {
                    throw new PlanValidationException("Duplicate placement at " + position);
                }
                count++;
                if (count > limits.maxPlacements()) {
                    throw new PlanValidationException(
                            "Plan exceeds placement limit of " + limits.maxPlacements());
                }
                placements.add(new PlanPlacement(
                        placement.x, placement.y, placement.z, placement.block));
            }
            phases.add(new PlanPhase(phase.name, placements));
        }
        return phases;
    }

    private record Position(int x, int y, int z) {
    }

    private static final class RawPlan {
        int formatVersion;
        String id;
        RawDimensions dimensions;
        Map<String, String> palette;
        List<RawPhase> phases;
    }

    private static final class RawDimensions {
        int x;
        int y;
        int z;
    }

    private static final class RawPhase {
        String name;
        List<RawPlacement> placements;
    }

    private static final class RawPlacement {
        int x;
        int y;
        int z;
        String block;
    }
}
