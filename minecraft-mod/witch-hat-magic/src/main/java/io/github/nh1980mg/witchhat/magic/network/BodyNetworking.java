package io.github.nh1980mg.witchhat.magic.network;

import io.github.nh1980mg.witchhat.magic.body.BodyPart;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookLimits;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import io.github.nh1980mg.witchhat.magic.quest.BrotherhoodService;
import io.github.nh1980mg.witchhat.magic.quest.QuestWorldState;
import io.github.nh1980mg.witchhat.magic.registry.MagicItems;
import io.github.nh1980mg.witchhat.magic.spell.ActivationResult;
import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import io.github.nh1980mg.witchhat.magic.spell.CircleSupport;
import io.github.nh1980mg.witchhat.magic.spell.GameplayEffectService;
import io.github.nh1980mg.witchhat.magic.spell.ManifestationPlan;
import io.github.nh1980mg.witchhat.magic.spell.RecognizedSpell;
import io.github.nh1980mg.witchhat.magic.spell.SpellManifestationService;
import io.github.nh1980mg.witchhat.magic.spell.SpellRecognizer;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.item.ItemStack;

/** Forbidden body ink: open, save, and activate tattoos on body parts. */
public final class BodyNetworking {
    private BodyNetworking() {
    }

    public static void registerPayloads() {
        PayloadTypeRegistry.playS2C().register(OpenBodyPayload.TYPE, OpenBodyPayload.CODEC);
        PayloadTypeRegistry.playC2S().register(
                OpenBodyRequestPayload.TYPE, OpenBodyRequestPayload.CODEC);
        PayloadTypeRegistry.playC2S().register(SaveTattooPayload.TYPE, SaveTattooPayload.CODEC);
        PayloadTypeRegistry.playC2S().register(ActivateTattooPayload.TYPE, ActivateTattooPayload.CODEC);
    }

    public static void registerServerReceivers() {
        ServerPlayNetworking.registerGlobalReceiver(
                SaveTattooPayload.TYPE, BodyNetworking::handleSave);
        ServerPlayNetworking.registerGlobalReceiver(
                ActivateTattooPayload.TYPE, BodyNetworking::handleActivation);
        ServerPlayNetworking.registerGlobalReceiver(
                OpenBodyRequestPayload.TYPE,
                (payload, context) -> open(context.player()));
    }

    public static void open(ServerPlayer player) {
        if (!BrotherhoodService.isMember(player)) {
            return;
        }
        QuestWorldState state = QuestWorldState.get(player.getServer());
        ServerPlayNetworking.send(player, new OpenBodyPayload(state.tattoos(player.getUUID())));
    }

    private static void handleSave(
            SaveTattooPayload payload,
            ServerPlayNetworking.Context context) {
        ServerPlayer player = context.player();
        if (!BrotherhoodService.isMember(player)) {
            return;
        }
        try {
            NotebookPage validated = NotebookLimits.validate(
                    singlePageData(payload.page())).selectedPage();
            QuestWorldState.get(player.getServer())
                    .setTattoo(player.getUUID(), payload.part(), validated);
        } catch (IllegalArgumentException ignored) {
            // fall through: echo the authoritative tattoo either way
        }
        QuestWorldState state = QuestWorldState.get(player.getServer());
        ServerPlayNetworking.send(player, new OpenBodyPayload(state.tattoos(player.getUUID())));
    }

    private static NotebookData singlePageData(NotebookPage page) {
        return new NotebookData(NotebookData.CURRENT_FORMAT, page.id(), java.util.List.of(page));
    }

    private static void handleActivation(
            ActivateTattooPayload payload,
            ServerPlayNetworking.Context context) {
        ServerPlayer player = context.player();
        ActivationResult result;
        if (!BrotherhoodService.isMember(player)) {
            result = ActivationResult.failure(ActivationStatus.FORBIDDEN, payload.pageId());
        } else {
            QuestWorldState state = QuestWorldState.get(player.getServer());
            NotebookPage page = state.tattoo(player.getUUID(), payload.part());
            if (page == null || !page.id().equals(payload.pageId())) {
                result = ActivationResult.failure(ActivationStatus.PAGE_NOT_FOUND, payload.pageId());
            } else {
                RecognizedSpell spell = SpellRecognizer.recognize(page, CircleSupport.NOTEBOOK);
                ActivationStatus status = switch (spell.status()) {
                    case EMPTY -> ActivationStatus.EMPTY_PAGE;
                    case MISSING_SIGIL -> ActivationStatus.MISSING_SIGIL;
                    case MISSING_CIRCLE -> ActivationStatus.MISSING_CIRCLE;
                    case IRREGULAR_CIRCLE -> ActivationStatus.IRREGULAR_CIRCLE;
                    case READY -> ActivationStatus.SUCCESS;
                };
                result = new ActivationResult(
                        status, payload.pageId(), spell.sigilIds(), spell.signIds(),
                        spell.power(), spell.precision(), spell.durationTicks(),
                        spell.directionX(), spell.directionY(), spell.lift());
                if (status == ActivationStatus.SUCCESS) {
                    if (!ActivationRateLimits.tryAcquire(player)) {
                        result = ActivationResult.failure(ActivationStatus.COOLDOWN, payload.pageId());
                    } else if (!consumeBloodInk(player)) {
                        result = ActivationResult.failure(ActivationStatus.FORBIDDEN, payload.pageId());
                    } else {
                        GameplayEffectService.apply(player, result);
                        ManifestationPlan plan = ManifestationPlan.create(
                                player.getEyePosition(), player.getLookAngle(), result);
                        SpellManifestationService.enqueue(
                                plan, result.durationTicks(), player.serverLevel(),
                                SpellManifestationService.levitationDrift(result));
                        player.sendSystemMessage(Component.translatable(
                                        "quest.witch_hat_magic.tattoo_activated",
                                        Component.translatable(
                                                "body.witch_hat_magic." + payload.part().id()),
                                        result.sigilIds().getFirst())
                                .withStyle(ChatFormatting.DARK_PURPLE));
                    }
                }
            }
        }
        ServerPlayNetworking.send(player, SpellActivationResultPayload.from(
                InteractionHand.MAIN_HAND, result));
    }

    private static boolean consumeBloodInk(ServerPlayer player) {
        for (int slot = 0; slot < player.getInventory().getContainerSize(); slot++) {
            ItemStack stack = player.getInventory().getItem(slot);
            if (stack.is(MagicItems.BLOOD_INK)) {
                stack.shrink(1);
                return true;
            }
        }
        return false;
    }
}
