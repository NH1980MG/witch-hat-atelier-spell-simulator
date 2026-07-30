package io.github.nh1980mg.witchhat.magic.spell;

import io.github.nh1980mg.witchhat.magic.block.AbstractCanvasBlock;
import io.github.nh1980mg.witchhat.magic.blockentity.CanvasBlockEntity;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookLimits;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import java.util.Objects;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.Vec3;

public final class CanvasActivationService {
    public record CanvasActivationOutcome(ActivationResult result, int remainingActivations) {}

    private CanvasActivationService() {}

    /** Recognizes the canvas drawing without consuming durability or manifesting. */
    public static CanvasActivationOutcome evaluate(
            ServerLevel level,
            BlockPos pos,
            String pageId) {
        Objects.requireNonNull(level, "level");
        Objects.requireNonNull(pos, "pos");
        Objects.requireNonNull(pageId, "pageId");

        BlockEntity blockEntity = level.getBlockEntity(pos);
        if (!(blockEntity instanceof CanvasBlockEntity canvas)) {
            return new CanvasActivationOutcome(
                    ActivationResult.failure(ActivationStatus.CANVAS_NOT_FOUND, pageId), 0);
        }
        if (canvas.remainingActivations() <= 0) {
            return new CanvasActivationOutcome(
                    ActivationResult.failure(ActivationStatus.CANVAS_DEPLETED, pageId),
                    canvas.remainingActivations());
        }

        NotebookData data;
        try {
            data = NotebookLimits.validate(canvas.drawing());
        } catch (IllegalArgumentException | NullPointerException exception) {
            return new CanvasActivationOutcome(
                    ActivationResult.failure(ActivationStatus.INVALID_NOTEBOOK, pageId),
                    canvas.remainingActivations());
        }
        NotebookPage page = data.pages().stream()
                .filter(candidate -> candidate.id().equals(pageId))
                .findFirst()
                .orElse(null);
        if (page == null) {
            return new CanvasActivationOutcome(
                    ActivationResult.failure(ActivationStatus.PAGE_NOT_FOUND, pageId),
                    canvas.remainingActivations());
        }

        RecognizedSpell spell = SpellRecognizer.recognize(page, canvas.support());
        ActivationStatus status = switch (spell.status()) {
            case EMPTY -> ActivationStatus.EMPTY_PAGE;
            case MISSING_SIGIL -> ActivationStatus.MISSING_SIGIL;
            case MISSING_CIRCLE -> ActivationStatus.MISSING_CIRCLE;
            case IRREGULAR_CIRCLE -> ActivationStatus.IRREGULAR_CIRCLE;
            case READY -> ActivationStatus.SUCCESS;
        };
        ActivationResult result = new ActivationResult(
                status,
                pageId,
                spell.sigilIds(),
                spell.signIds(),
                spell.power(),
                spell.precision(),
                spell.durationTicks());
        return new CanvasActivationOutcome(result, canvas.remainingActivations());
    }

    /** Consumes durability and manifests a previously evaluated SUCCESS outcome. */
    public static void commit(
            ServerLevel level,
            BlockPos pos,
            ActivationResult result,
            CanvasBlockEntity canvas) {
        Objects.requireNonNull(result, "result");
        Objects.requireNonNull(canvas, "canvas");
        if (result.status() != ActivationStatus.SUCCESS) {
            return;
        }
        canvas.consumeActivations(CanvasBlockEntity.activationCost(result.power()));
        BlockState state = level.getBlockState(pos);
        Direction facing = Direction.NORTH;
        Vec3 anchor = Vec3.atCenterOf(pos).add(0.0, 0.9, 0.0);
        if (state.getBlock() instanceof AbstractCanvasBlock canvasBlock) {
            facing = state.getValue(AbstractCanvasBlock.FACING);
            anchor = canvasBlock.manifestationAnchor(pos, facing);
        }
        Vec3 normal = Vec3.atLowerCornerOf(facing.getNormal());
        ManifestationPlan plan = ManifestationPlan.createAnchored(anchor, normal, result);
        SpellManifestationService.enqueue(plan, result.durationTicks(), level);
    }
}
