package io.github.nh1980mg.witchhat.magic.spell;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.PlacedSymbol;
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
        RecognizedSpell spell = SpellRecognizer.recognize(pageWith(
                symbol("eau", 0.5F, 0.5F),
                symbol("orbe", 0.7F, 0.5F),
                symbol("orbe", 0.3F, 0.5F)));

        assertEquals(RecognitionStatus.READY, spell.status());
        assertEquals(List.of("eau"), spell.sigilIds());
        assertEquals(List.of("orbe", "orbe"), spell.signIds());
        assertTrue(spell.activatable());
    }

    @Test
    void preservesMultipleSigilsForFutureMixtureRecipes() {
        RecognizedSpell spell = SpellRecognizer.recognize(pageWith(
                symbol("feu", 0.45F, 0.5F),
                symbol("eau", 0.55F, 0.5F),
                symbol("colonne", 0.5F, 0.75F)));

        assertEquals(List.of("feu", "eau"), spell.sigilIds());
        assertEquals(List.of("colonne"), spell.signIds());
        assertTrue(spell.activatable());
    }

    private static NotebookPage pageWith(PlacedSymbol... symbols) {
        return new NotebookPage("page-1", "Page 1", List.of(), List.of(symbols));
    }

    private static PlacedSymbol symbol(String id, float x, float y) {
        return new PlacedSymbol(id, new NormalizedPoint(x, y), 0.15F, 0.0F);
    }
}
