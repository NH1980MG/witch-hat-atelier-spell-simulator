package io.github.nh1980mg.witchhat.magic.item;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.registry.MagicComponents;
import io.github.nh1980mg.witchhat.magic.spell.CircleSupport;
import io.github.nh1980mg.witchhat.magic.spell.RecognizedSpell;
import io.github.nh1980mg.witchhat.magic.spell.SpellRecognizer;
import io.github.nh1980mg.witchhat.magic.symbol.MagicSymbolCatalog;
import java.util.List;
import java.util.Locale;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;

/** A notebook page torn out as an item — the spell circle travels with it. */
public class MagicCirclePageItem extends Item {
    public MagicCirclePageItem(Properties properties) {
        super(properties);
    }

    @Override
    public void appendHoverText(
            ItemStack stack,
            TooltipContext context,
            List<Component> tooltip,
            TooltipFlag flag) {
        NotebookPage page = stack.get(MagicComponents.PAGE_DATA);
        if (page == null) {
            return;
        }
        tooltip.add(Component.translatable(
                "item.witch_hat_magic.magic_circle_page.page", page.title())
                .withStyle(ChatFormatting.GRAY));
        appendSpellTooltip(tooltip, page);
    }

    public static void appendSpellTooltip(List<Component> tooltip, NotebookPage page) {
        RecognizedSpell spell = SpellRecognizer.recognize(page, CircleSupport.NOTEBOOK);
        if (!spell.sigilIds().isEmpty()) {
            tooltip.add(Component.translatable(
                    "item.witch_hat_magic.magic_circle_page.sigils",
                    localizedNames(spell.sigilIds()))
                    .withStyle(ChatFormatting.GOLD));
        }
        if (!spell.signIds().isEmpty()) {
            tooltip.add(Component.translatable(
                    "item.witch_hat_magic.magic_circle_page.signs",
                    localizedNames(spell.signIds()))
                    .withStyle(ChatFormatting.YELLOW));
        }
        if (spell.activatable()) {
            tooltip.add(Component.translatable(
                    "item.witch_hat_magic.magic_circle_page.ready",
                    String.format(Locale.ROOT, "%.2f", spell.power()),
                    Math.round(spell.precision() * 100),
                    spell.durationTicks() / 20)
                    .withStyle(ChatFormatting.GREEN));
        } else {
            tooltip.add(Component.translatable(
                    "item.witch_hat_magic.magic_circle_page.not_ready")
                    .withStyle(ChatFormatting.RED));
        }
    }

    private static String localizedNames(List<String> ids) {
        return ids.stream()
                .map(id -> MagicSymbolCatalog.entries().stream()
                        .filter(entry -> entry.id().equals(id))
                        .findFirst()
                        .map(entry -> entry.frenchName().equals(entry.englishName())
                                ? entry.frenchName()
                                : entry.frenchName() + " / " + entry.englishName())
                        .orElse(id))
                .reduce((a, b) -> a + " + " + b)
                .orElse("");
    }
}
