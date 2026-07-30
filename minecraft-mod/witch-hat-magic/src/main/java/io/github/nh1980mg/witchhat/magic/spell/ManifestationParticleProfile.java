package io.github.nh1980mg.witchhat.magic.spell;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.core.particles.SimpleParticleType;

public enum ManifestationParticleProfile {
    FIRE,
    WATER,
    EARTH,
    WIND,
    LIGHT,
    SMOKE,
    CRYSTAL,
    ARCANE;

    public static ManifestationParticleProfile forSigils(List<String> sigilIds) {
        Objects.requireNonNull(sigilIds, "sigilIds");
        if (sigilIds.isEmpty()) {
            throw new IllegalArgumentException("A manifestation requires at least one sigil");
        }

        String primarySigil = Objects.requireNonNull(sigilIds.getFirst(), "primary sigil")
                .toLowerCase(Locale.ROOT);
        return switch (primarySigil) {
            case "feu", "flammes_sans_chaleur" -> FIRE;
            case "eau" -> WATER;
            case "terre" -> EARTH;
            case "vent", "aeriforme", "vent_sous_pied", "vent_tourbillonnant" ->
                    WIND;
            case "lumiere" -> LIGHT;
            case "fumee" -> SMOKE;
            case "cristal" -> CRYSTAL;
            default -> ARCANE;
        };
    }

    public SimpleParticleType particle() {
        return switch (this) {
            case FIRE -> ParticleTypes.FLAME;
            case WATER -> ParticleTypes.SPLASH;
            case EARTH -> ParticleTypes.COMPOSTER;
            case WIND -> ParticleTypes.CLOUD;
            case LIGHT -> ParticleTypes.END_ROD;
            case SMOKE -> ParticleTypes.LARGE_SMOKE;
            case CRYSTAL -> ParticleTypes.SNOWFLAKE;
            case ARCANE -> ParticleTypes.ENCHANT;
        };
    }
}
