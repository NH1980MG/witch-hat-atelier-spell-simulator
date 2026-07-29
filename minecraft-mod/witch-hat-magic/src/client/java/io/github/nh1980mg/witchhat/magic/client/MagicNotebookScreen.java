package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.network.SaveNotebookPayload;
import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookStroke;
import java.util.List;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;

public final class MagicNotebookScreen extends Screen {
    private static final int BACKGROUND = 0xE0182230;
    private static final int PARCHMENT = 0xFFF6E8BF;
    private static final int PARCHMENT_EDGE = 0xFF9D7440;
    private static final int INK = 0xFF17243A;
    private static final int ACTIVE_INK = 0xFFB2582D;

    private final InteractionHand hand;
    private final NotebookEditorSession session;
    private Tool tool = Tool.PEN;
    private boolean drawing;
    private boolean workshopShell;
    private double viewZoom = 1.0;
    private int canvasLeft;
    private int canvasTop;
    private int canvasDiameter;
    private NotebookData lastSent;

    private Button penButton;
    private Button eraserButton;
    private Button undoButton;
    private Button redoButton;
    private Button previousButton;
    private Button nextButton;
    private Button deleteButton;

    public MagicNotebookScreen(InteractionHand hand, NotebookData data) {
        super(Component.translatable("screen.witch_hat_magic.notebook"));
        this.hand = hand;
        this.session = new NotebookEditorSession(data);
        this.lastSent = data;
    }

    InteractionHand hand() {
        return hand;
    }

    void acceptAuthoritative(NotebookData data) {
        session.acceptAuthoritative(data);
        lastSent = data;
        updateButtonStates();
    }

    @Override
    protected void init() {
        int gap = 2;
        int buttonWidth = Math.max(38, Math.min(64, (width - 14) / 6));
        int firstRowWidth = buttonWidth * 6 + gap * 5;
        int firstX = Math.max(4, (width - firstRowWidth) / 2);
        int firstY = height - 46;

        penButton = addControl("screen.witch_hat_magic.pen", firstX, firstY, buttonWidth, button -> {
            tool = Tool.PEN;
            updateButtonStates();
        });
        eraserButton = addControl(
                "screen.witch_hat_magic.eraser",
                firstX + (buttonWidth + gap),
                firstY,
                buttonWidth,
                button -> {
                    tool = Tool.ERASER;
                    updateButtonStates();
                });
        undoButton = addControl(
                "screen.witch_hat_magic.undo",
                firstX + (buttonWidth + gap) * 2,
                firstY,
                buttonWidth,
                button -> session.undo());
        redoButton = addControl(
                "screen.witch_hat_magic.redo",
                firstX + (buttonWidth + gap) * 3,
                firstY,
                buttonWidth,
                button -> session.redo());
        addControl(
                "screen.witch_hat_magic.clear",
                firstX + (buttonWidth + gap) * 4,
                firstY,
                buttonWidth,
                button -> session.clear());
        addControl(
                "screen.witch_hat_magic.save",
                firstX + (buttonWidth + gap) * 5,
                firstY,
                buttonWidth,
                button -> sendSave());

        int secondRowWidth = buttonWidth * 5 + gap * 4;
        int secondX = Math.max(4, (width - secondRowWidth) / 2);
        int secondY = height - 23;
        previousButton = addControl(
                "screen.witch_hat_magic.previous",
                secondX,
                secondY,
                buttonWidth,
                button -> session.previousPage());
        nextButton = addControl(
                "screen.witch_hat_magic.next",
                secondX + (buttonWidth + gap),
                secondY,
                buttonWidth,
                button -> session.nextPage());
        addControl(
                "screen.witch_hat_magic.add_page",
                secondX + (buttonWidth + gap) * 2,
                secondY,
                buttonWidth,
                button -> session.addPage());
        deleteButton = addControl(
                "screen.witch_hat_magic.delete_page",
                secondX + (buttonWidth + gap) * 3,
                secondY,
                buttonWidth,
                button -> session.deletePage());
        addControl(
                "screen.witch_hat_magic.workshop",
                secondX + (buttonWidth + gap) * 4,
                secondY,
                buttonWidth,
                button -> workshopShell = !workshopShell);

        updateCanvasBounds();
        updateButtonStates();
    }

    @Override
    public void render(GuiGraphics graphics, int mouseX, int mouseY, float partialTick) {
        graphics.fill(0, 0, width, height, BACKGROUND);
        updateCanvasBounds();
        renderCircularPage(graphics);
        renderStrokes(graphics, session.snapshot().selectedPage().strokes(), INK);
        renderStroke(graphics, session.activeStroke(), ACTIVE_INK);

        graphics.drawCenteredString(font, title, width / 2, 9, 0xFFF6E8BF);
        Component pageLabel = Component.translatable(
                "screen.witch_hat_magic.page_count",
                session.snapshot().selectedPageIndex() + 1,
                session.snapshot().pages().size());
        graphics.drawCenteredString(font, pageLabel, width / 2, 21, 0xFFD9B875);

        if (workshopShell) {
            renderWorkshopShell(graphics);
        }

        updateButtonStates();
        super.render(graphics, mouseX, mouseY, partialTick);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button == 0 && isPointerInsidePage(mouseX, mouseY)) {
            double logicalX = unzoom(mouseX, canvasLeft + canvasDiameter / 2.0);
            double logicalY = unzoom(mouseY, canvasTop + canvasDiameter / 2.0);
            if (tool == Tool.ERASER) {
                session.eraseAt(
                        logicalX,
                        logicalY,
                        canvasLeft,
                        canvasTop,
                        canvasDiameter,
                        10.0 / viewZoom);
            } else {
                drawing = session.beginStroke(
                        logicalX,
                        logicalY,
                        canvasLeft,
                        canvasTop,
                        canvasDiameter);
            }
            return true;
        }
        return super.mouseClicked(mouseX, mouseY, button);
    }

    @Override
    public boolean mouseDragged(
            double mouseX,
            double mouseY,
            int button,
            double dragX,
            double dragY) {
        if (drawing && button == 0) {
            session.appendPoint(
                    unzoom(mouseX, canvasLeft + canvasDiameter / 2.0),
                    unzoom(mouseY, canvasTop + canvasDiameter / 2.0),
                    canvasLeft,
                    canvasTop,
                    canvasDiameter);
            return true;
        }
        return super.mouseDragged(mouseX, mouseY, button, dragX, dragY);
    }

    @Override
    public boolean mouseReleased(double mouseX, double mouseY, int button) {
        if (drawing && button == 0) {
            session.endStroke();
            drawing = false;
            return true;
        }
        return super.mouseReleased(mouseX, mouseY, button);
    }

    @Override
    public boolean mouseScrolled(
            double mouseX,
            double mouseY,
            double horizontalAmount,
            double verticalAmount) {
        if (isPointerInsidePage(mouseX, mouseY) && verticalAmount != 0.0) {
            viewZoom = Math.clamp(viewZoom + Math.signum(verticalAmount) * 0.1, 0.75, 1.75);
            return true;
        }
        return super.mouseScrolled(mouseX, mouseY, horizontalAmount, verticalAmount);
    }

    @Override
    public void onClose() {
        if (!session.snapshot().equals(lastSent)) {
            sendSave();
        }
        super.onClose();
    }

    @Override
    public boolean isPauseScreen() {
        return false;
    }

    private Button addControl(
            String translationKey,
            int x,
            int y,
            int buttonWidth,
            Button.OnPress onPress) {
        return addRenderableWidget(Button.builder(Component.translatable(translationKey), onPress)
                .bounds(x, y, buttonWidth, 20)
                .build());
    }

    private void updateCanvasBounds() {
        int availableHeight = Math.max(48, height - 84);
        canvasDiameter = Math.max(48, Math.min(width - 16, availableHeight));
        canvasLeft = (width - canvasDiameter) / 2;
        canvasTop = 32 + Math.max(0, (availableHeight - canvasDiameter) / 2);
    }

    private void renderCircularPage(GuiGraphics graphics) {
        int radius = canvasDiameter / 2;
        int centerX = canvasLeft + radius;
        int centerY = canvasTop + radius;
        for (int y = -radius; y <= radius; y++) {
            int halfWidth = (int) Math.sqrt((long) radius * radius - (long) y * y);
            graphics.fill(centerX - halfWidth, centerY + y, centerX + halfWidth + 1, centerY + y + 1, PARCHMENT);
        }

        int outerRadius = Math.max(1, radius - 1);
        for (int angle = 0; angle < 360; angle++) {
            double radians = Math.toRadians(angle);
            int x = centerX + (int) Math.round(Math.cos(radians) * outerRadius);
            int y = centerY + (int) Math.round(Math.sin(radians) * outerRadius);
            graphics.fill(x, y, x + 1, y + 1, PARCHMENT_EDGE);
        }
    }

    private void renderStrokes(
            GuiGraphics graphics,
            List<NotebookStroke> strokes,
            int color) {
        for (NotebookStroke stroke : strokes) {
            renderStroke(graphics, stroke.points(), color);
        }
    }

    private void renderStroke(
            GuiGraphics graphics,
            List<NormalizedPoint> points,
            int color) {
        if (points.isEmpty()) {
            return;
        }
        if (points.size() == 1) {
            drawPoint(graphics, points.getFirst(), color);
            return;
        }
        for (int index = 1; index < points.size(); index++) {
            drawLine(graphics, points.get(index - 1), points.get(index), color);
        }
    }

    private void drawLine(
            GuiGraphics graphics,
            NormalizedPoint start,
            NormalizedPoint end,
            int color) {
        int startX = screenX(start.x());
        int startY = screenY(start.y());
        int endX = screenX(end.x());
        int endY = screenY(end.y());
        int steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
        if (steps == 0) {
            drawPixel(graphics, startX, startY, color);
            return;
        }
        for (int step = 0; step <= steps; step++) {
            double amount = (double) step / steps;
            int x = (int) Math.round(startX + (endX - startX) * amount);
            int y = (int) Math.round(startY + (endY - startY) * amount);
            drawPixel(graphics, x, y, color);
        }
    }

    private void drawPoint(GuiGraphics graphics, NormalizedPoint point, int color) {
        drawPixel(graphics, screenX(point.x()), screenY(point.y()), color);
    }

    private static void drawPixel(GuiGraphics graphics, int x, int y, int color) {
        graphics.fill(x - 1, y - 1, x + 2, y + 2, color);
    }

    private int screenX(float normalizedX) {
        double base = canvasLeft + normalizedX * canvasDiameter;
        return (int) Math.round(zoom(base, canvasLeft + canvasDiameter / 2.0));
    }

    private int screenY(float normalizedY) {
        double base = canvasTop + normalizedY * canvasDiameter;
        return (int) Math.round(zoom(base, canvasTop + canvasDiameter / 2.0));
    }

    private double zoom(double value, double center) {
        return center + (value - center) * viewZoom;
    }

    private double unzoom(double value, double center) {
        return center + (value - center) / viewZoom;
    }

    private boolean isPointerInsidePage(double x, double y) {
        double dx = x - (canvasLeft + canvasDiameter / 2.0);
        double dy = y - (canvasTop + canvasDiameter / 2.0);
        double radius = canvasDiameter / 2.0;
        return dx * dx + dy * dy <= radius * radius;
    }

    private void renderWorkshopShell(GuiGraphics graphics) {
        int panelWidth = Math.min(220, width - 24);
        int panelHeight = 46;
        int x = (width - panelWidth) / 2;
        int y = canvasTop + canvasDiameter / 2 - panelHeight / 2;
        graphics.fill(x, y, x + panelWidth, y + panelHeight, 0xEE26344A);
        graphics.renderOutline(x, y, panelWidth, panelHeight, 0xFFD9B875);
        graphics.drawCenteredString(
                font,
                Component.translatable("screen.witch_hat_magic.workshop_shell"),
                width / 2,
                y + 9,
                0xFFF6E8BF);
        graphics.drawCenteredString(
                font,
                Component.translatable("screen.witch_hat_magic.workshop_shell_hint"),
                width / 2,
                y + 26,
                0xFFD9B875);
    }

    private void updateButtonStates() {
        if (undoButton == null) {
            return;
        }
        undoButton.active = session.canUndo();
        redoButton.active = session.canRedo();
        previousButton.active = session.snapshot().selectedPageIndex() > 0;
        nextButton.active = session.snapshot().selectedPageIndex() + 1 < session.snapshot().pages().size();
        deleteButton.active = session.snapshot().pages().size() > 1;
        penButton.active = tool != Tool.PEN;
        eraserButton.active = tool != Tool.ERASER;
    }

    private void sendSave() {
        NotebookData snapshot = session.snapshot();
        if (ClientPlayNetworking.canSend(SaveNotebookPayload.TYPE)) {
            ClientPlayNetworking.send(new SaveNotebookPayload(hand, snapshot));
            lastSent = snapshot;
        }
    }

    private enum Tool {
        PEN,
        ERASER
    }
}
