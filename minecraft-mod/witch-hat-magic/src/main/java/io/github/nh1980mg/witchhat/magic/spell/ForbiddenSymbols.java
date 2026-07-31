package io.github.nh1980mg.witchhat.magic.spell;

import io.github.nh1980mg.witchhat.magic.symbol.MagicSymbolCatalog;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Forbidden sigils and signs — the ink of the Brimmed Caps. Hidden from the
 * regular catalog; only brotherhood members may place and cast them, and
 * every casting burns a vial of blood ink.
 */
public final class ForbiddenSymbols {
    private static final Set<String> IDS = Set.of(
            "loup_ecaille",
            "arret_temporel",
            "sangsue_valance",
            "crush",
            "arret");

    private ForbiddenSymbols() {}

    public static boolean isForbidden(String id) {
        return IDS.contains(id.toLowerCase(Locale.ROOT));
    }

    public static boolean anyForbidden(Collection<String> ids) {
        return ids.stream().anyMatch(ForbiddenSymbols::isForbidden);
    }

    public static List<MagicSymbolCatalog.Entry> forbiddenEntries() {
        return MagicSymbolCatalog.entries().stream()
                .filter(entry -> isForbidden(entry.id()))
                .toList();
    }

    public static List<MagicSymbolCatalog.Entry> regularEntries() {
        return MagicSymbolCatalog.entries().stream()
                .filter(entry -> !isForbidden(entry.id()))
                .toList();
    }
}
