package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.network.ActivateSpellPayload;
import io.github.nh1980mg.witchhat.magic.network.SaveNotebookPayload;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.spell.CircleSupport;
import java.util.Objects;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.minecraft.world.InteractionHand;

public final class NotebookTransport implements EditorTransport {
    private final InteractionHand hand;

    public NotebookTransport(InteractionHand hand) {
        this.hand = Objects.requireNonNull(hand, "hand");
    }

    @Override
    public void sendSave(NotebookData data) {
        ClientPlayNetworking.send(new SaveNotebookPayload(hand, data));
    }

    @Override
    public void sendActivation(String pageId) {
        ClientPlayNetworking.send(new ActivateSpellPayload(hand, pageId));
    }

    @Override
    public boolean canSend() {
        return ClientPlayNetworking.canSend(SaveNotebookPayload.TYPE)
                && ClientPlayNetworking.canSend(ActivateSpellPayload.TYPE);
    }

    @Override
    public Object key() {
        return hand;
    }

    @Override
    public CircleSupport support() {
        return CircleSupport.NOTEBOOK;
    }

    @Override
    public boolean multiPage() {
        return true;
    }
}
