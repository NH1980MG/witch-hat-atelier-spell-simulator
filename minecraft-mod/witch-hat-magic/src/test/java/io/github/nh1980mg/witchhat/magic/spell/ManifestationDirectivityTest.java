package io.github.nh1980mg.witchhat.magic.spell;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.PlacedSymbol;
import java.util.List;
import org.junit.jupiter.api.Test;

final class ManifestationDirectivityTest {
    private static final double DELTA = 1.0E-6;

    @Test
    void staysNeutralWithoutSigns() {
        NotebookPage page = NotebookPage.blank("page-1", "Page 1");

        ManifestationDirectivity directivity = ManifestationDirectivity.analyze(page);

        assertEquals(0.0, directivity.directionX(), DELTA);
        assertEquals(0.0, directivity.directionY(), DELTA);
        assertEquals(0.0, directivity.lift(), DELTA);
    }

    @Test
    void tiltsTowardTheHeavierSide() {
        NotebookPage page = pageWith(
                sign("orbe", 0.85F, 0.5F),
                sign("lien", 0.8F, 0.55F));

        ManifestationDirectivity directivity = ManifestationDirectivity.analyze(page);

        assertTrue(directivity.directionX() > 0.5,
                "signs placed right should tilt right, got " + directivity.directionX());
        assertTrue(Math.abs(directivity.directionY()) < 0.2);
    }

    @Test
    void aRotatedColumnPointsTheManifestation() {
        NotebookPage page = pageWith(sign("colonne", 0.5F, 0.5F, 90.0F));

        ManifestationDirectivity directivity = ManifestationDirectivity.analyze(page);

        assertTrue(directivity.directionX() > 0.4,
                "a column rotated 90 degrees should point right, got " + directivity.directionX());
    }

    @Test
    void clampsTheMagnitudeToOne() {
        NotebookPage page = pageWith(
                sign("colonne", 0.95F, 0.5F, 90.0F),
                sign("orbe", 0.95F, 0.5F));

        ManifestationDirectivity directivity = ManifestationDirectivity.analyze(page);

        double magnitude = Math.hypot(directivity.directionX(), directivity.directionY());
        assertTrue(magnitude <= 1.0, "magnitude " + magnitude);
    }

    @Test
    void detectsTheLevitationSign() {
        assertEquals(1.0, ManifestationDirectivity.analyze(
                pageWith(sign("levitation", 0.5F, 0.5F))).lift(), DELTA);
        assertEquals(0.0, ManifestationDirectivity.analyze(
                pageWith(sign("orbe", 0.5F, 0.5F))).lift(), DELTA);
    }

    private static PlacedSymbol sign(String id, float x, float y) {
        return sign(id, x, y, 0.0F);
    }

    private static PlacedSymbol sign(String id, float x, float y, float rotationDegrees) {
        return new PlacedSymbol(id, new NormalizedPoint(x, y), 0.15F, rotationDegrees);
    }

    private static NotebookPage pageWith(PlacedSymbol... symbols) {
        return new NotebookPage("page-1", "Page 1", List.of(), List.of(symbols));
    }
}
