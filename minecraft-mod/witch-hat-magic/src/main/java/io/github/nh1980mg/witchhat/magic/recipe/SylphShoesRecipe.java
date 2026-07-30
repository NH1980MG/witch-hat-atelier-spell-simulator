package io.github.nh1980mg.witchhat.magic.recipe;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.registry.MagicComponents;
import io.github.nh1980mg.witchhat.magic.registry.MagicItems;
import io.github.nh1980mg.witchhat.magic.registry.MagicRecipes;
import io.github.nh1980mg.witchhat.magic.spell.CircleSupport;
import io.github.nh1980mg.witchhat.magic.spell.SpellRecognizer;
import net.minecraft.core.HolderLookup;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.crafting.CraftingBookCategory;
import net.minecraft.world.item.crafting.CraftingInput;
import net.minecraft.world.item.crafting.CustomRecipe;
import net.minecraft.world.item.crafting.RecipeSerializer;
import net.minecraft.world.level.Level;

/**
 * Sylph shoes: leather boots plus a magic circle page bearing a valid
 * underfoot-wind spell. The page is consumed; its circle stays inscribed
 * in the boots.
 */
public class SylphShoesRecipe extends CustomRecipe {
    public SylphShoesRecipe(CraftingBookCategory category) {
        super(category);
    }

    @Override
    public boolean matches(CraftingInput input, Level level) {
        return findValidPage(input) != null && countBoots(input) == 1;
    }

    @Override
    public boolean canCraftInDimensions(int width, int height) {
        return width * height >= 2;
    }

    @Override
    public ItemStack assemble(CraftingInput input, HolderLookup.Provider registries) {
        NotebookPage page = findValidPage(input);
        if (page == null || countBoots(input) != 1) {
            return ItemStack.EMPTY;
        }
        ItemStack result = new ItemStack(MagicItems.SYLPH_SHOES);
        result.set(MagicComponents.PAGE_DATA, page);
        return result;
    }

    @Override
    public RecipeSerializer<?> getSerializer() {
        return MagicRecipes.SYLPH_SHOES;
    }

    private static int countBoots(CraftingInput input) {
        int boots = 0;
        int others = 0;
        for (ItemStack stack : input.items()) {
            if (stack.is(Items.LEATHER_BOOTS)) {
                boots++;
            } else if (!stack.isEmpty() && !stack.is(MagicItems.MAGIC_CIRCLE_PAGE)) {
                others++;
            }
        }
        return others == 0 ? boots : -1;
    }

    private static NotebookPage findValidPage(CraftingInput input) {
        for (ItemStack stack : input.items()) {
            if (!stack.is(MagicItems.MAGIC_CIRCLE_PAGE)) {
                continue;
            }
            NotebookPage page = stack.get(MagicComponents.PAGE_DATA);
            if (page == null) {
                continue;
            }
            var spell = SpellRecognizer.recognize(page, CircleSupport.NOTEBOOK);
            if (spell.activatable()
                    && spell.sigilIds().stream().anyMatch(id -> id.equals("vent_sous_pied"))) {
                return page;
            }
        }
        return null;
    }
}
