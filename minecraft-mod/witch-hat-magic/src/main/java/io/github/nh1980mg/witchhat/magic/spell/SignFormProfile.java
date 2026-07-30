package io.github.nh1980mg.witchhat.magic.spell;

import java.util.List;
import java.util.Locale;

/**
 * Principal form signs shaping a manifestation, mirroring the web
 * spell-grammar roles: column, orb, bolt, rain, dispersion. Dispersion also
 * combines with column (diffuse column) and bolt (volley).
 */
public enum SignFormProfile {
    NONE,
    COLUMN,
    DIFFUSE_COLUMN,
    ORB,
    BOLT,
    VOLLEY,
    RAIN,
    DISPERSION;

    public static SignFormProfile forSigns(List<String> signIds) {
        boolean column = contains(signIds, "colonne");
        boolean bolt = contains(signIds, "projectile");
        boolean orb = contains(signIds, "orbe");
        boolean rain = contains(signIds, "pluie");
        boolean dispersion = contains(signIds, "dispersion");

        if (column && dispersion) {
            return DIFFUSE_COLUMN;
        }
        if (bolt && dispersion) {
            return VOLLEY;
        }
        if (column) {
            return COLUMN;
        }
        if (bolt) {
            return BOLT;
        }
        if (orb) {
            return ORB;
        }
        if (rain) {
            return RAIN;
        }
        if (dispersion) {
            return DISPERSION;
        }
        return NONE;
    }

    private static boolean contains(List<String> signIds, String id) {
        return signIds.stream().anyMatch(sign -> sign.toLowerCase(Locale.ROOT).equals(id));
    }
}
