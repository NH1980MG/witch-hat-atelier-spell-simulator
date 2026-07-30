package io.github.nh1980mg.witchhat.magic.spell;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookStroke;
import io.github.nh1980mg.witchhat.magic.notebook.PlacedSymbol;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

final class SpellRecognizerTest {
    @Test
    void reportsAnEmptyPage() {
        RecognizedSpell spell = SpellRecognizer.recognize(
                NotebookPage.blank("page-1", "Page 1"));

        assertEquals(RecognitionStatus.EMPTY, spell.status());
        assertTrue(spell.sigilIds().isEmpty());
        assertTrue(spell.signIds().isEmpty());
        assertFalse(spell.activatable());
    }

    @Test
    void rejectsSignsWithoutASigil() {
        RecognizedSpell spell = SpellRecognizer.recognize(pageWith(
                symbol("orbe", 0.5F, 0.5F),
                symbol("projectile", 0.7F, 0.5F)));

        assertEquals(RecognitionStatus.MISSING_SIGIL, spell.status());
        assertEquals(List.of("orbe", "projectile"), spell.signIds());
        assertFalse(spell.activatable());
    }

    @Test
    void recognizesASigilAndPreservesRepeatedSigns() {
        RecognizedSpell spell = SpellRecognizer.recognize(pageWithCircle(
                symbol("eau", 0.5F, 0.5F),
                symbol("orbe", 0.7F, 0.5F),
                symbol("orbe", 0.3F, 0.5F)));

        assertEquals(RecognitionStatus.READY, spell.status());
        assertEquals(List.of("eau"), spell.sigilIds());
        assertEquals(List.of("orbe", "orbe"), spell.signIds());
        assertTrue(spell.activatable());
        assertTrue(spell.power() >= 0.5 && spell.power() <= 1.0);
        assertTrue(spell.durationTicks() >= 60 && spell.durationTicks() <= 300);
    }

    @Test
    void preservesMultipleSigilsForFutureMixtureRecipes() {
        RecognizedSpell spell = SpellRecognizer.recognize(pageWithCircle(
                symbol("feu", 0.45F, 0.5F),
                symbol("eau", 0.55F, 0.5F),
                symbol("colonne", 0.5F, 0.75F)));

        assertEquals(List.of("feu", "eau"), spell.sigilIds());
        assertEquals(List.of("colonne"), spell.signIds());
        assertTrue(spell.activatable());
    }

    @Test
    void rejectsASigilWithoutAClosedEnclosingCircle() {
        RecognizedSpell spell = SpellRecognizer.recognize(pageWith(
                symbol("eau", 0.5F, 0.5F),
                symbol("orbe", 0.7F, 0.5F)));

        assertEquals(RecognitionStatus.MISSING_CIRCLE, spell.status());
        assertFalse(spell.activatable());
    }

    private static NotebookPage pageWith(PlacedSymbol... symbols) {
        return new NotebookPage("page-1", "Page 1", List.of(), List.of(symbols));
    }

    private static NotebookPage pageWithCircle(PlacedSymbol... symbols) {
        List<NormalizedPoint> points = new ArrayList<>();
        for (int index = 0; index < 40; index++) {
            double angle = 2.0 * Math.PI * index / 40;
            points.add(new NormalizedPoint(
                    (float) (0.5 + 0.35 * Math.cos(angle)),
                    (float) (0.5 + 0.35 * Math.sin(angle))));
        }
        return new NotebookPage(
                "page-1", "Page 1", List.of(new NotebookStroke(points)), List.of(symbols));
    }

    private static PlacedSymbol symbol(String id, float x, float y) {
        return new PlacedSymbol(id, new NormalizedPoint(x, y), 0.15F, 0.0F);
    }
}
