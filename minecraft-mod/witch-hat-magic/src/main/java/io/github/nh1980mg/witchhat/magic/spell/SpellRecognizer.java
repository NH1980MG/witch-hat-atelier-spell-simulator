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
        return recognize(page, CircleSupport.NOTEBOOK);
    }

    public static RecognizedSpell recognize(NotebookPage page, CircleSupport support) {
        Objects.requireNonNull(page, "page");
        Objects.requireNonNull(support, "support");
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

        if (sigils.isEmpty() && signs.isEmpty()) {
            return new RecognizedSpell(RecognitionStatus.EMPTY, sigils, signs);
        }
        if (sigils.isEmpty()) {
            return new RecognizedSpell(RecognitionStatus.MISSING_SIGIL, sigils, signs);
        }
        CircleEvaluation circle = CircleAnalyzer.evaluate(page, support);
        return switch (circle.verdict()) {
            case NO_CIRCLE -> new RecognizedSpell(RecognitionStatus.MISSING_CIRCLE, sigils, signs);
            case IRREGULAR -> new RecognizedSpell(
                    RecognitionStatus.IRREGULAR_CIRCLE, sigils, signs,
                    0.0, circle.precision(), 0);
            case VALID -> new RecognizedSpell(
                    RecognitionStatus.READY, sigils, signs,
                    circle.power(), circle.precision(), circle.durationTicks());
        };
    }
}
