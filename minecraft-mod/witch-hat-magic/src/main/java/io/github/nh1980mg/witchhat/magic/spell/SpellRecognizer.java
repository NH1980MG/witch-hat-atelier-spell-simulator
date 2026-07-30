package io.github.nh1980mg.witchhat.magic.spell;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.notebook.PlacedSymbol;
import io.github.nh1980mg.witchhat.magic.symbol.MagicSymbolCatalog;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public final class SpellRecognizer {
    private SpellRecognizer() {}

    public static RecognizedSpell recognize(NotebookPage page) {
        Objects.requireNonNull(page, "page");
        List<String> sigils = new ArrayList<>();
        List<String> signs = new ArrayList<>();
        for (PlacedSymbol symbol : page.symbols()) {
            MagicSymbolCatalog.Entry entry = MagicSymbolCatalog.entries().stream()
                    .filter(candidate -> candidate.id().equals(symbol.symbolId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown magic symbol: " + symbol.symbolId()));
            if (entry.category() == MagicSymbolCatalog.Category.SIGIL) {
                sigils.add(entry.id());
            } else {
                signs.add(entry.id());
            }
        }

        RecognitionStatus status;
        if (sigils.isEmpty() && signs.isEmpty()) {
            status = RecognitionStatus.EMPTY;
        } else if (sigils.isEmpty()) {
            status = RecognitionStatus.MISSING_SIGIL;
        } else {
            status = RecognitionStatus.READY;
        }
        return new RecognizedSpell(status, sigils, signs);
    }
}
