package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.body.BodyPart;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookPage;
import java.util.EnumMap;
import java.util.Map;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.gui.screens.inventory.InventoryScreen;
import net.minecraft.network.chat.Component;

/**
 * The forbidden mirror: a manipulable 3D view of your own body. Click a part
 * to open the ink editor on it — body ink is the Brimmed Caps' art.
 */
public class BodyPaintScreen extends Screen {
    private static final int BACKGROUND = 0xFF141020;

    private final Map<BodyPart, NotebookPage> tattoos;
    private float yaw;

    public BodyPaintScreen(Map<BodyPart, NotebookPage> tattoos) {
        super(Component.translatable("screen.witch_hat_magic.body"));
        this.tattoos = new EnumMap<>(tattoos);
    }

    @Override
    public void render(GuiGraphics graphics, int mouseX, int mouseY, float partialTick) {
        graphics.fill(0, 0, width, height, BACKGROUND);
        graphics.drawCenteredString(font, title, width / 2, 12, 0xFFF6E8BF);
        graphics.drawCenteredString(
                font,
                Component.translatable("screen.witch_hat_magic.body.hint"),
                width / 2,
                26,
                0xFF9D8FB8);

        int modelX = width / 2;
        int modelTop = 50;
        int modelBottom = height - 70;
        if (minecraft != null && minecraft.player != null) {
            yaw += (mouseX - modelX) * 0.02F;
            float targetYaw = (modelX - mouseX) * 0.6F;
            yaw += (targetYaw - yaw) * 0.15F;
            float pitch = (modelTop + 90 - mouseY) * 0.25F;
            InventoryScreen.renderEntityInInventoryFollowsMouse(
                    graphics,
                    modelX - 70,
                    modelTop,
                    modelX + 70,
                    modelBottom,
                    45,
                    0.0F,
                    mouseX,
                    mouseY,
                    minecraft.player);
        }

        renderPartHotspot(graphics, BodyPart.HEAD, width / 2, modelTop + 6, mouseX, mouseY);
        renderPartHotspot(graphics, BodyPart.TORSO, width / 2, modelTop + 90, mouseX, mouseY);
        renderPartHotspot(graphics, BodyPart.LEFT_ARM, width / 2 + 68, modelTop + 80, mouseX, mouseY);
        renderPartHotspot(graphics, BodyPart.RIGHT_ARM, width / 2 - 68, modelTop + 80, mouseX, mouseY);
        renderPartHotspot(graphics, BodyPart.LEFT_LEG, width / 2 + 26, modelBottom - 26, mouseX, mouseY);
        renderPartHotspot(graphics, BodyPart.RIGHT_LEG, width / 2 - 26, modelBottom - 26, mouseX, mouseY);
        super.render(graphics, mouseX, mouseY, partialTick);
    }

    private void renderPartHotspot(
            GuiGraphics graphics,
            BodyPart part,
            int centerX,
            int centerY,
            int mouseX,
            int mouseY) {
        boolean tattooed = tattoos.containsKey(part)
                && (!tattoos.get(part).strokes().isEmpty()
                        || !tattoos.get(part).symbols().isEmpty());
        boolean hovered = Math.abs(mouseX - centerX) <= 28 && Math.abs(mouseY - centerY) <= 10;
        int color = hovered ? 0xFFB2582D : tattooed ? 0xFFB24A4A : 0xFF5B7691;
        graphics.fill(centerX - 28, centerY - 10, centerX + 28, centerY + 10, 0xC0182230);
        graphics.renderOutline(centerX - 28, centerY - 10, 56, 20, color);
        graphics.drawCenteredString(
                font,
                Component.translatable("body.witch_hat_magic." + part.id()),
                centerX,
                centerY - 4,
                tattooed ? 0xFFB2582D : 0xFFF6E8BF);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        int modelTop = 50;
        int modelBottom = height - 70;
        BodyPart clicked = null;
        if (hit(mouseX, mouseY, width / 2, modelTop + 6)) clicked = BodyPart.HEAD;
        else if (hit(mouseX, mouseY, width / 2, modelTop + 90)) clicked = BodyPart.TORSO;
        else if (hit(mouseX, mouseY, width / 2 + 68, modelTop + 80)) clicked = BodyPart.LEFT_ARM;
        else if (hit(mouseX, mouseY, width / 2 - 68, modelTop + 80)) clicked = BodyPart.RIGHT_ARM;
        else if (hit(mouseX, mouseY, width / 2 + 26, modelBottom - 26)) clicked = BodyPart.LEFT_LEG;
        else if (hit(mouseX, mouseY, width / 2 - 26, modelBottom - 26)) clicked = BodyPart.RIGHT_LEG;
        if (clicked != null) {
            NotebookPage page = tattoos.getOrDefault(
                    clicked, NotebookPage.blank(clicked.id() + "-page", clicked.id()));
            NotebookData data = new NotebookData(
                    NotebookData.CURRENT_FORMAT, page.id(), java.util.List.of(page));
            Minecraft.getInstance().setScreen(
                    new MagicNotebookScreen(new BodyTransport(clicked), data));
            return true;
        }
        return super.mouseClicked(mouseX, mouseY, button);
    }

    private static boolean hit(double mouseX, double mouseY, int centerX, int centerY) {
        return Math.abs(mouseX - centerX) <= 28 && Math.abs(centerY - mouseY) <= 10;
    }
}
