package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookLimits;
import io.github.nh1980mg.witchhat.magic.registry.MagicComponents;
import io.github.nh1980mg.witchhat.magic.registry.MagicItems;
import io.github.nh1980mg.witchhat.magic.spell.ActivationResult;
import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import io.github.nh1980mg.witchhat.magic.spell.GameplayEffectService;
import io.github.nh1980mg.witchhat.magic.spell.SpellActivationService;
import io.github.nh1980mg.witchhat.magic.spell.SpellManifestationService;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.item.ItemStack;

public final class NotebookNetworking {
    private NotebookNetworking() {
    }

    public static void registerPayloads() {
        PayloadTypeRegistry.playS2C().register(OpenNotebookPayload.TYPE, OpenNotebookPayload.CODEC);
        PayloadTypeRegistry.playS2C().register(SyncNotebookPayload.TYPE, SyncNotebookPayload.CODEC);
        PayloadTypeRegistry.playS2C().register(
                SpellActivationResultPayload.TYPE, SpellActivationResultPayload.CODEC);
        PayloadTypeRegistry.playC2S().register(SaveNotebookPayload.TYPE, SaveNotebookPayload.CODEC);
        PayloadTypeRegistry.playC2S().register(
                ActivateSpellPayload.TYPE, ActivateSpellPayload.CODEC);
    }

    public static void registerServerReceivers() {
        ServerPlayNetworking.registerGlobalReceiver(
                SaveNotebookPayload.TYPE,
                NotebookNetworking::handleSave);
        ServerPlayNetworking.registerGlobalReceiver(
                ActivateSpellPayload.TYPE,
                NotebookNetworking::handleActivation);
    }

    public static void open(ServerPlayer player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        NotebookData data = stack.getOrDefault(
                MagicComponents.NOTEBOOK_DATA, NotebookData.createDefault());
        ServerPlayNetworking.send(player, new OpenNotebookPayload(hand, NotebookLimits.validate(data)));
    }

    private static void handleSave(
            SaveNotebookPayload payload,
            ServerPlayNetworking.Context context) {
        ServerPlayer player = context.player();
        ItemStack heldStack = player.getItemInHand(payload.hand());
        if (heldStack.isEmpty() || !heldStack.is(MagicItems.MAGIC_CIRCLE_NOTEBOOK)) {
            return;
        }

        try {
            NotebookData validated = NotebookSaveValidator.validate(
                    heldStack, MagicItems.MAGIC_CIRCLE_NOTEBOOK, payload.data());
            heldStack.set(MagicComponents.NOTEBOOK_DATA, validated);
            ServerPlayNetworking.send(
                    player, new SyncNotebookPayload(payload.hand(), validated));
        } catch (IllegalArgumentException ignored) {
            NotebookData authoritative = heldStack.getOrDefault(
                    MagicComponents.NOTEBOOK_DATA, NotebookData.createDefault());
            ServerPlayNetworking.send(
                    player, new SyncNotebookPayload(payload.hand(), authoritative));
        }
    }

    private static void handleActivation(
            ActivateSpellPayload payload,
            ServerPlayNetworking.Context context) {
        ServerPlayer player = context.player();
        ItemStack heldStack = player.getItemInHand(payload.hand());
        NotebookData authoritative = heldStack.getOrDefault(
                MagicComponents.NOTEBOOK_DATA, NotebookData.createDefault());
        ActivationResult activation = SpellActivationService.activate(
                heldStack,
                MagicItems.MAGIC_CIRCLE_NOTEBOOK,
                authoritative,
                payload.pageId());
        boolean manifestationAllowed = activation.status() != ActivationStatus.SUCCESS
                || ActivationRateLimits.tryAcquire(player);
        ActivationResult result = ActivationDispatch.applyRateLimit(
                activation, manifestationAllowed);
        ActivationDispatch.run(
                result,
                () -> ServerPlayNetworking.send(
                        player,
                        SpellActivationResultPayload.from(payload.hand(), result)),
                () -> {
                    SpellManifestationService.show(player, result);
                    GameplayEffectService.apply(player, result);
                });
    }
}
