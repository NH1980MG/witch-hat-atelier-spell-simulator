package io.github.nh1980mg.witchhat.magic.spell;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookLimits;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import java.util.Objects;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;

public final class SpellActivationService {
    private SpellActivationService() {}

    public static ActivationResult activate(
            ItemStack heldStack,
            Item expectedNotebookItem,
            NotebookData authoritativeData,
            String pageId) {
        Objects.requireNonNull(heldStack, "heldStack");
        Objects.requireNonNull(expectedNotebookItem, "expectedNotebookItem");
        Objects.requireNonNull(pageId, "pageId");
        if (heldStack.isEmpty() || !heldStack.is(expectedNotebookItem)) {
            return ActivationResult.failure(ActivationStatus.INVALID_NOTEBOOK, pageId);
        }

        NotebookData data;
        try {
            data = NotebookLimits.validate(authoritativeData);
        } catch (IllegalArgumentException | NullPointerException exception) {
            return ActivationResult.failure(ActivationStatus.INVALID_NOTEBOOK, pageId);
        }

        NotebookPage page = data.pages().stream()
                .filter(candidate -> candidate.id().equals(pageId))
                .findFirst()
                .orElse(null);
        if (page == null) {
            return ActivationResult.failure(ActivationStatus.PAGE_NOT_FOUND, pageId);
        }

        RecognizedSpell spell = SpellRecognizer.recognize(page);
        ActivationStatus status = switch (spell.status()) {
            case EMPTY -> ActivationStatus.EMPTY_PAGE;
            case MISSING_SIGIL -> ActivationStatus.MISSING_SIGIL;
            case READY -> ActivationStatus.SUCCESS;
        };
        return new ActivationResult(status, pageId, spell.sigilIds(), spell.signIds());
    }
}
