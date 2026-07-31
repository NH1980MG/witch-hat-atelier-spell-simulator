package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.spell.CircleSupport;

/**
 * Channel through which the shared drawing screen persists and activates —
 * the notebook talks by interaction hand, a placed canvas by block position.
 */
public interface EditorTransport {
    void sendSave(NotebookData data);

    void sendActivation(String pageId);

    /** Tears the page out of the notebook as an item (notebook only). */
    default void sendExtract(String pageId) {}

    boolean canSend();

    /** Correlation key used to match authoritative packets: hand or BlockPos. */
    Object key();

    /** Whether a result payload carrying this key belongs to this editor. */
    default boolean matchesResult(Object payloadKey) {
        return key().equals(payloadKey);
    }

    CircleSupport support();

    default boolean multiPage() {
        return false;
    }
}
