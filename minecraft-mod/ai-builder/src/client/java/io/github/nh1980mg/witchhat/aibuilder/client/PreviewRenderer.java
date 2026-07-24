package io.github.nh1980mg.witchhat.aibuilder.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import io.github.nh1980mg.witchhat.aibuilder.preview.PreviewPlacement;
import io.github.nh1980mg.witchhat.aibuilder.preview.PreviewState;
import io.github.nh1980mg.witchhat.aibuilder.preview.PreviewStatus;
import net.fabricmc.fabric.api.client.rendering.v1.WorldRenderContext;
import net.minecraft.client.renderer.LevelRenderer;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

public final class PreviewRenderer {
    private PreviewRenderer() {
    }

    public static void render(WorldRenderContext context, PreviewState state) {
        state.expire(context.world().getGameTime());
        PreviewState.Snapshot snapshot = state.snapshot();
        if (snapshot.placements().isEmpty()
                || !context.world().dimension().location().toString().equals(snapshot.dimension())) {
            return;
        }

        PoseStack matrices = context.matrixStack();
        VertexConsumer lines = context.consumers().getBuffer(RenderType.lines());
        Vec3 camera = context.camera().getPosition();
        matrices.pushPose();
        matrices.translate(-camera.x, -camera.y, -camera.z);
        for (PreviewPlacement placement : snapshot.placements()) {
            AABB bounds = new AABB(
                    placement.x(),
                    placement.y(),
                    placement.z(),
                    placement.x() + 1,
                    placement.y() + 1,
                    placement.z() + 1).inflate(0.002);
            if (context.frustum().isVisible(bounds)) {
                renderBox(matrices, lines, bounds, placement.status());
            }
        }
        matrices.popPose();
    }

    private static void renderBox(
            PoseStack matrices,
            VertexConsumer lines,
            AABB bounds,
            PreviewStatus status) {
        switch (status) {
            case REPLACEABLE ->
                    LevelRenderer.renderLineBox(matrices, lines, bounds, 0.2f, 0.95f, 0.35f, 0.8f);
            case OCCUPIED ->
                    LevelRenderer.renderLineBox(matrices, lines, bounds, 1.0f, 0.65f, 0.1f, 0.8f);
            case PROTECTED ->
                    LevelRenderer.renderLineBox(matrices, lines, bounds, 1.0f, 0.15f, 0.15f, 0.8f);
        }
    }
}
