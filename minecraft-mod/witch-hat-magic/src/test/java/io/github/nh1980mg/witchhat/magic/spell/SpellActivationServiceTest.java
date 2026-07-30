package io.github.nh1980mg.witchhat.magic.spell;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.PlacedSymbol;
import java.util.List;
import net.minecraft.SharedConstants;
import net.minecraft.server.Bootstrap;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

final class SpellActivationServiceTest {
    @BeforeAll
    static void bootstrapMinecraftRegistries() {
        SharedConstants.tryDetectVersion();
        Bootstrap.bootStrap();
    }

    @Test
    void rejectsAStackThatIsNotTheExpectedNotebook() {
        ActivationResult result = SpellActivationService.activate(
                new ItemStack(Items.BOOK),
                Items.WRITABLE_BOOK,
                NotebookData.createDefault(),
                "page-1");

        assertEquals(ActivationStatus.INVALID_NOTEBOOK, result.status());
    }

    @Test
    void rejectsAnUnknownPage() {
        ActivationResult result = SpellActivationService.activate(
                new ItemStack(Items.WRITABLE_BOOK),
                Items.WRITABLE_BOOK,
                NotebookData.createDefault(),
                "missing");

        assertEquals(ActivationStatus.PAGE_NOT_FOUND, result.status());
    }

    @Test
    void rejectsAPageWithoutASigil() {
        ActivationResult result = SpellActivationService.activate(
                new ItemStack(Items.WRITABLE_BOOK),
                Items.WRITABLE_BOOK,
                notebookWith(symbol("orbe")),
                "page-1");

        assertEquals(ActivationStatus.MISSING_SIGIL, result.status());
        assertEquals(List.of("orbe"), result.signIds());
    }

    @Test
    void returnsOnlyTheServerRecognizedSpellOnSuccess() {
        ActivationResult result = SpellActivationService.activate(
                new ItemStack(Items.WRITABLE_BOOK),
                Items.WRITABLE_BOOK,
                notebookWith(symbol("eau"), symbol("orbe"), symbol("orbe")),
                "page-1");

        assertEquals(ActivationStatus.SUCCESS, result.status());
        assertEquals(List.of("eau"), result.sigilIds());
        assertEquals(List.of("orbe", "orbe"), result.signIds());
    }

    private static NotebookData notebookWith(PlacedSymbol... symbols) {
        NotebookPage page = new NotebookPage(
                "page-1", "Page 1", List.of(), List.of(symbols));
        return new NotebookData(NotebookData.CURRENT_FORMAT, page.id(), List.of(page));
    }

    private static PlacedSymbol symbol(String id) {
        return new PlacedSymbol(
                id, new NormalizedPoint(0.5F, 0.5F), 0.15F, 0.0F);
    }
}
