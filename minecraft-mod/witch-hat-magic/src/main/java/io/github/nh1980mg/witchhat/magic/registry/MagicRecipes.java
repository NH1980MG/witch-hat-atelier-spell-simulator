package io.github.nh1980mg.witchhat.magic.registry;

import io.github.nh1980mg.witchhat.magic.WitchHatMagicMod;
import io.github.nh1980mg.witchhat.magic.recipe.SylphShoesRecipe;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.crafting.RecipeSerializer;
import net.minecraft.world.item.crafting.SimpleCraftingRecipeSerializer;

public final class MagicRecipes {
    public static RecipeSerializer<SylphShoesRecipe> SYLPH_SHOES;

    private MagicRecipes() {
    }

    public static void register() {
        SYLPH_SHOES = Registry.register(
                BuiltInRegistries.RECIPE_SERIALIZER,
                ResourceLocation.fromNamespaceAndPath(WitchHatMagicMod.MOD_ID, "sylph_shoes"),
                new SimpleCraftingRecipeSerializer<>(SylphShoesRecipe::new));
    }
}
