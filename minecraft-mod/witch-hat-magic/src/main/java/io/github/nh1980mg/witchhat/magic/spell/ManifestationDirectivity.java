package io.github.nh1980mg.witchhat.magic.spell;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.PlacedSymbol;
import io.github.nh1980mg.witchhat.magic.symbol.MagicSymbolCatalog;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Manga-faithful directivity: an imbalance between the signs tilts the
 * manifestation toward the heavier side, and a column sign's own rotation
 * points it further ("un desequilibre entre les signes incline la
 * manifestation"). Page-space vector, magnitude clamped to 1.
 */
public record ManifestationDirectivity(double directionX, double directionY, double lift) {
    private static final double PAGE_CENTER = 0.5;
    private static final double POSITION_WEIGHT = 2.0;
    private static final double COLUMN_ROTATION_WEIGHT = 0.5;
    private static final double MAX_MAGNITUDE = 1.0;

    public static ManifestationDirectivity neutral() {
        return new ManifestationDirectivity(0.0, 0.0, 0.0);
    }

    public static ManifestationDirectivity analyze(NotebookPage page) {
        Objects.requireNonNull(page, "page");
        List<PlacedSymbol> signs = page.symbols().stream()
                .filter(ManifestationDirectivity::isSign)
                .toList();
        double lift = signs.stream().anyMatch(symbol -> symbol.symbolId()
                .toLowerCase(Locale.ROOT).equals("levitation")) ? 1.0 : 0.0;
        if (signs.isEmpty()) {
            return new ManifestationDirectivity(0.0, 0.0, lift);
        }

        double sumX = 0.0;
        double sumY = 0.0;
        for (PlacedSymbol sign : signs) {
            NormalizedPoint center = sign.center();
            sumX += center.x() - PAGE_CENTER;
            sumY += center.y() - PAGE_CENTER;
        }
        double directionX = sumX / signs.size() * POSITION_WEIGHT;
        double directionY = sumY / signs.size() * POSITION_WEIGHT;

        for (PlacedSymbol sign : signs) {
            if (sign.symbolId().toLowerCase(Locale.ROOT).equals("colonne")) {
                double radians = Math.toRadians(sign.rotationDegrees());
                // 0 degree points toward the top of the page (negative y).
                directionX += Math.sin(radians) * COLUMN_ROTATION_WEIGHT;
                directionY -= Math.cos(radians) * COLUMN_ROTATION_WEIGHT;
            }
        }

        double magnitude = Math.hypot(directionX, directionY);
        if (magnitude > MAX_MAGNITUDE) {
            directionX *= MAX_MAGNITUDE / magnitude;
            directionY *= MAX_MAGNITUDE / magnitude;
        }
        return new ManifestationDirectivity(directionX, directionY, lift);
    }

    private static boolean isSign(PlacedSymbol symbol) {
        return MagicSymbolCatalog.entries().stream()
                .anyMatch(entry -> entry.id().equals(symbol.symbolId())
                        && entry.category() == MagicSymbolCatalog.Category.SIGN);
    }
}
