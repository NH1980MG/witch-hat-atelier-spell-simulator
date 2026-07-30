package io.github.nh1980mg.witchhat.magic.item;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.registry.MagicComponents;
import java.util.List;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.ArmorMaterials;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;

/** Leather boots fit to bear an underfoot-wind circle — the sylph shoes. */
public class SylphShoesItem extends ArmorItem {
    public SylphShoesItem(Properties properties) {
        super(ArmorMaterials.LEATHER, Type.BOOTS, properties);
    }

    @Override
    public void appendHoverText(
            ItemStack stack,
            TooltipContext context,
            List<Component> tooltip,
            TooltipFlag flag) {
        NotebookPage page = stack.get(MagicComponents.PAGE_DATA);
        if (page != null) {
            MagicCirclePageItem.appendSpellTooltip(tooltip, page);
        }
    }

    /** True when a valid underfoot-wind circle is inscribed in the boots. */
    public static boolean isInscribed(ItemStack stack) {
        if (!(stack.getItem() instanceof SylphShoesItem)) {
            return false;
        }
        NotebookPage page = stack.get(MagicComponents.PAGE_DATA);
        if (page == null) {
            return false;
        }
        var spell = io.github.nh1980mg.witchhat.magic.spell.SpellRecognizer.recognize(
                page, io.github.nh1980mg.witchhat.magic.spell.CircleSupport.NOTEBOOK);
        return spell.activatable()
                && spell.sigilIds().stream().anyMatch(id -> id.equals("vent_sous_pied"));
    }
}
