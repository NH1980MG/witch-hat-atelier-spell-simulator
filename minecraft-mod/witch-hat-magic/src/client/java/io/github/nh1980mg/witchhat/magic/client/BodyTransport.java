package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.body.BodyPart;
import io.github.nh1980mg.witchhat.magic.network.ActivateTattooPayload;
import io.github.nh1980mg.witchhat.magic.network.SaveTattooPayload;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.spell.CircleSupport;
import java.util.Objects;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;

/** Editor channel for one body part: tattoo save/activation by part id. */
public final class BodyTransport implements EditorTransport {
    private final BodyPart part;

    public BodyTransport(BodyPart part) {
        this.part = Objects.requireNonNull(part, "part");
    }

    @Override
    public void sendSave(NotebookData data) {
        ClientPlayNetworking.send(new SaveTattooPayload(part, data.selectedPage()));
    }

    @Override
    public void sendActivation(String pageId) {
        ClientPlayNetworking.send(new ActivateTattooPayload(part, pageId));
    }

    @Override
    public boolean canSend() {
        return ClientPlayNetworking.canSend(SaveTattooPayload.TYPE)
                && ClientPlayNetworking.canSend(ActivateTattooPayload.TYPE);
    }

    @Override
    public Object key() {
        return part;
    }

    @Override
    public boolean matchesResult(Object payloadKey) {
        // Tattoo results reuse the notebook result channel (main hand).
        return payloadKey == net.minecraft.world.InteractionHand.MAIN_HAND;
    }

    @Override
    public CircleSupport support() {
        return CircleSupport.NOTEBOOK;
    }
}
