package io.github.nh1980mg.witchhat.magic.symbol;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public final class MagicSymbolCatalog {
    public enum Category {
        SIGIL,
        SIGN
    }

    public record Entry(
            String id,
            String frenchName,
            String englishName,
            Category category) {
    }

    private static final List<Entry> ENTRIES = List.of(
            new Entry("feu", "Feu", "Fire", Category.SIGIL),
            new Entry("eau", "Eau", "Water", Category.SIGIL),
            new Entry("terre", "Terre", "Earth", Category.SIGIL),
            new Entry("vent", "Vent", "Wind", Category.SIGIL),
            new Entry("lumiere", "Lumiere", "Light", Category.SIGIL),
            new Entry("cristal", "Cristal", "Crystal", Category.SIGIL),
            new Entry("aeriforme", "Aeriforme", "Aeriform", Category.SIGIL),
            new Entry("vent_sous_pied", "Vent sous pied", "Wind underfoot", Category.SIGIL),
            new Entry("repetition", "Repetition", "Repetition", Category.SIGIL),
            new Entry("fumee", "Fumee", "Smoke", Category.SIGIL),
            new Entry("sangsue_valance", "Sangsue-valance", "Valance Leech", Category.SIGIL),
            new Entry("frillram", "Frillram", "Frillram", Category.SIGIL),
            new Entry("epee", "Epee", "Sword", Category.SIGIL),
            new Entry("loup_ecaille", "Loup-ecaille", "Scalewolf", Category.SIGIL),
            new Entry("cerf_torche", "Cerf-torche", "Torchstag", Category.SIGIL),
            new Entry("chevre_lion", "Chevre-lion", "Liongoat", Category.SIGIL),
            new Entry("chat_hibou", "Chat-hibou", "Owlcat", Category.SIGIL),
            new Entry("tete_de_chat_hibou", "Tete de chat-hibou", "Owlcat Head", Category.SIGIL),
            new Entry("dragon", "Dragon", "Dragon", Category.SIGIL),
            new Entry("fleur", "Fleur", "Flower", Category.SIGIL),
            new Entry("cheval", "Cheval", "Horse", Category.SIGIL),
            new Entry("oiseau_a", "Oiseau A", "Bird A", Category.SIGIL),
            new Entry("oiseau_b", "Oiseau B", "Bird B", Category.SIGIL),
            new Entry("arret_temporel", "Arret temporel", "Stop", Category.SIGIL),
            new Entry("vent_tourbillonnant", "Vent tourbillonnant", "Whorling Wind", Category.SIGIL),
            new Entry("flammes_sans_chaleur", "Flammes sans chaleur", "Unburning Flames", Category.SIGIL),
            new Entry("colonne", "Colonne", "Column", Category.SIGN),
            new Entry("dispersion", "Dispersion", "Dispersion", Category.SIGN),
            new Entry("levitation", "Levitation", "Levitation", Category.SIGN),
            new Entry("traction", "Traction", "Pull", Category.SIGN),
            new Entry("region", "Region", "Region", Category.SIGN),
            new Entry("convergence", "Convergence", "Convergence", Category.SIGN),
            new Entry("collection", "Collection", "Collection", Category.SIGN),
            new Entry("nuage", "Nuage", "Billow", Category.SIGN),
            new Entry("crush", "Crush", "Crush", Category.SIGN),
            new Entry("pantin", "Pantin", "Puppet", Category.SIGN),
            new Entry("flottement", "Flottement", "Float", Category.SIGN),
            new Entry("etirement", "Etirement", "Stretch Weave", Category.SIGN),
            new Entry("spire_physique", "Spire physique", "Physical coil", Category.SIGN),
            new Entry("refroidissement", "Refroidissement", "Cooling", Category.SIGN),
            new Entry("renforcement", "Renforcement", "Strengthen", Category.SIGN),
            new Entry("cible", "Cible", "Sights", Category.SIGN),
            new Entry("enlacement", "Enlacement", "Entwine", Category.SIGN),
            new Entry("signe_de_vent", "Signe de vent", "Wind sign", Category.SIGN),
            new Entry("aeriforme_defini", "Aeriforme defini", "Defined aeriform", Category.SIGN),
            new Entry("rassemblement", "Rassemblement", "Gathering", Category.SIGN),
            new Entry("glaives", "Glaives", "Depth", Category.SIGN),
            new Entry("solidification", "Solidification", "Solidification", Category.SIGN),
            new Entry("lien", "Lien", "Link", Category.SIGN),
            new Entry("arret", "Arret", "Bind", Category.SIGN),
            new Entry("enveloppe", "Enveloppe", "Wrap", Category.SIGN),
            new Entry("dissimulation", "Dissimulation", "Concealment", Category.SIGN),
            new Entry("reflection", "Reflection", "Reflection", Category.SIGN),
            new Entry("diamant", "Diamant", "Diamond", Category.SIGN),
            new Entry("fenetre", "Fenetre", "Window", Category.SIGN),
            new Entry("agrandissement", "Agrandissement", "Expansion", Category.SIGN),
            new Entry("viseur", "Viseur", "Crosshair", Category.SIGN),
            new Entry("radial", "Radial", "Radial", Category.SIGN),
            new Entry("projectile", "Projectile", "Bolt", Category.SIGN),
            new Entry("pluie", "Pluie", "Rain", Category.SIGN),
            new Entry("orbe", "Orbe", "Orb", Category.SIGN),
            new Entry("purification", "Purification", "Purification", Category.SIGN),
            new Entry("immobilite", "Immobilite", "Stillness", Category.SIGN),
            new Entry("projection", "Projection", "Projection", Category.SIGN));
    private static final Set<String> IDS = ENTRIES.stream()
            .map(Entry::id)
            .collect(Collectors.toUnmodifiableSet());

    private MagicSymbolCatalog() {
    }

    public static List<Entry> entries() {
        return ENTRIES;
    }

    public static boolean contains(String id) {
        return IDS.contains(id);
    }
}
