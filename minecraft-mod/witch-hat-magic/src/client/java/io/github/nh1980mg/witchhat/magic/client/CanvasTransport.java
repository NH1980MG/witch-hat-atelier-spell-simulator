package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.network.ActivateCanvasPayload;
import io.github.nh1980mg.witchhat.magic.network.SaveCanvasPayload;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.spell.CircleSupport;
import java.util.Objects;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.minecraft.core.BlockPos;

public final class CanvasTransport implements EditorTransport {
    private final BlockPos pos;
    private final CircleSupport support;

    public CanvasTransport(BlockPos pos, CircleSupport support) {
        this.pos = Objects.requireNonNull(pos, "pos");
        this.support = Objects.requireNonNull(support, "support");
    }

    @Override
    public void sendSave(NotebookData data) {
        ClientPlayNetworking.send(new SaveCanvasPayload(pos, data));
    }

    @Override
    public void sendActivation(String pageId) {
        ClientPlayNetworking.send(new ActivateCanvasPayload(pos, pageId));
    }

    @Override
    public boolean canSend() {
        return ClientPlayNetworking.canSend(SaveCanvasPayload.TYPE)
                && ClientPlayNetworking.canSend(ActivateCanvasPayload.TYPE);
    }

    @Override
    public Object key() {
        return pos;
    }

    @Override
    public CircleSupport support() {
        return support;
    }
}
