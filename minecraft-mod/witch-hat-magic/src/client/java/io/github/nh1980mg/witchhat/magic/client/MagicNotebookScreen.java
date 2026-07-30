package io.github.nh1980mg.witchhat.magic.client;

import com.mojang.math.Axis;
import io.github.nh1980mg.witchhat.magic.network.ActivateSpellPayload;
import io.github.nh1980mg.witchhat.magic.network.SaveNotebookPayload;
import io.github.nh1980mg.witchhat.magic.network.SpellActivationResultPayload;
import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookData;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookLimits;
import io.github.nh1980mg.witchhat.magic.notebook.NotebookStroke;
import io.github.nh1980mg.witchhat.magic.notebook.PlacedSymbol;
import io.github.nh1980mg.witchhat.magic.notebook.TracingGuide;
import io.github.nh1980mg.witchhat.magic.spell.ActivationStatus;
import io.github.nh1980mg.witchhat.magic.spell.RecognizedSpell;
import io.github.nh1980mg.witchhat.magic.spell.SpellRecognizer;
import io.github.nh1980mg.witchhat.magic.symbol.MagicSymbolCatalog;
import java.util.List;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.InteractionHand;
import org.lwjgl.glfw.GLFW;

public final class MagicNotebookScreen extends Screen {
    private static final int BACKGROUND = 0xE0182230;
    private static final int PARCHMENT = 0xFFF6E8BF;
    private static final int PARCHMENT_EDGE = 0xFF9D7440;
    private static final int INK = 0xFF17243A;
    private static final int ACTIVE_INK = 0xFFB2582D;
    private static final int SELECTION = 0xFF4BA8D8;
    private static final int CATALOG_WIDTH = 116;
    private static final int CATALOG_CELL = 34;
    private static final int CATALOG_COLUMNS = 3;
    private static final int CATALOG_ROW_HEIGHT = 38;
    private static final int DEFAULT_SYMBOL_SIZE = 48;

    private final InteractionHand hand;
    private final NotebookEditorSession session;
    private Tool tool = Tool.PEN;
    private boolean drawing;
    private boolean workshopShell;
    private double viewZoom = 1.0;
    private int catalogScrollRow;
    private String armedSymbolId;
    private boolean pageIndexOpen;
    private int pageIndexScroll;
    private RightGesture rightGesture = RightGesture.NONE;
    private NormalizedPoint rightStart;
    private NormalizedPoint rightCurrent;
    private NormalizedPoint rightMoveAnchor;
    private double lastResizeDistance;
    private int canvasLeft;
    private int canvasTop;
    private int canvasDiameter;
    private NotebookData lastSent;
    private RecognizedSpell lastRecognition;
    private Component activationFeedback;

    private Button penButton;
    private Button eraserButton;
    private Button undoButton;
    private Button redoButton;
    private Button previousButton;
    private Button nextButton;
    private Button deleteButton;
    private Button pagesButton;
    private Button renamePageButton;
    private Button duplicatePageButton;
    private Button movePageLeftButton;
    private Button movePageRightButton;
    private Button closePagesButton;
    private Button activationButton;
    private EditBox pageTitleBox;

    public MagicNotebookScreen(InteractionHand hand, NotebookData data) {
        super(Component.translatable("screen.witch_hat_magic.notebook"));
        this.hand = hand;
        this.session = new NotebookEditorSession(data);
        this.lastSent = data;
        this.lastRecognition = SpellRecognizer.recognize(data.selectedPage());
    }

    InteractionHand hand() {
        return hand;
    }

    void acceptAuthoritative(NotebookData data) {
        session.acceptAuthoritative(data);
        lastSent = data;
        refreshRecognition();
        updateButtonStates();
    }

    void acceptActivationResult(SpellActivationResultPayload payload) {
        if (payload.hand() != hand
                || !payload.pageId().equals(session.snapshot().selectedPageId())) {
            return;
        }
        if (payload.status() == ActivationStatus.SUCCESS) {
            String sigils = payload.sigilIds().stream()
                    .map(this::localizedSymbolName)
                    .reduce((left, right) -> left + " + " + right)
                    .orElse("");
            activationFeedback = Component.translatable(
                    ActivationFeedback.activationKey(payload.status()), sigils);
        } else {
            activationFeedback = Component.translatable(
                    ActivationFeedback.activationKey(payload.status()));
        }
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

        int secondRowWidth = buttonWidth * 6 + gap * 5;
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
        pagesButton = addControl(
                "screen.witch_hat_magic.pages",
                secondX + (buttonWidth + gap) * 2,
                secondY,
                buttonWidth,
                button -> setPageIndexOpen(true));
        addControl(
                "screen.witch_hat_magic.add_page",
                secondX + (buttonWidth + gap) * 3,
                secondY,
                buttonWidth,
                button -> session.addPage());
        deleteButton = addControl(
                "screen.witch_hat_magic.delete_page",
                secondX + (buttonWidth + gap) * 4,
                secondY,
                buttonWidth,
                button -> session.deletePage());
        addControl(
                "screen.witch_hat_magic.workshop",
                secondX + (buttonWidth + gap) * 5,
                secondY,
                buttonWidth,
                button -> {
                    workshopShell = !workshopShell;
                    armedSymbolId = null;
                    clearRightGesture();
                    updatePageWidgetVisibility();
                });

        int overlayLeft = Math.max(8, width / 2 - 120);
        int overlayTop = Math.max(38, height / 2 - 92);
        pageTitleBox = addRenderableWidget(new EditBox(
                font,
                overlayLeft + 10,
                overlayTop + 24,
                220,
                20,
                Component.translatable("screen.witch_hat_magic.page_title")));
        pageTitleBox.setMaxLength(64);
        int pageActionWidth = 42;
        renamePageButton = addControl(
                "screen.witch_hat_magic.rename",
                overlayLeft + 10,
                overlayTop + 47,
                pageActionWidth,
                button -> applyPageRename());
        duplicatePageButton = addControl(
                "screen.witch_hat_magic.duplicate",
                overlayLeft + 55,
                overlayTop + 47,
                pageActionWidth,
                button -> {
                    session.duplicatePage();
                    syncPageIndexSelection();
                });
        movePageLeftButton = addControl(
                "screen.witch_hat_magic.move_left",
                overlayLeft + 100,
                overlayTop + 47,
                pageActionWidth,
                button -> {
                    session.movePage(-1);
                    syncPageIndexSelection();
                });
        movePageRightButton = addControl(
                "screen.witch_hat_magic.move_right",
                overlayLeft + 145,
                overlayTop + 47,
                pageActionWidth,
                button -> {
                    session.movePage(1);
                    syncPageIndexSelection();
                });
        closePagesButton = addControl(
                "screen.witch_hat_magic.close",
                overlayLeft + 190,
                overlayTop + 47,
                40,
                button -> setPageIndexOpen(false));
        activationButton = addControl(
                "screen.witch_hat_magic.activate",
                7,
                height - 130,
                CATALOG_WIDTH - 8,
                button -> sendActivation());

        updateCanvasBounds();
        updatePageWidgetVisibility();
        updateButtonStates();
    }

    @Override
    public void render(GuiGraphics graphics, int mouseX, int mouseY, float partialTick) {
        graphics.fill(0, 0, width, height, BACKGROUND);
        updateCanvasBounds();
        renderCircularPage(graphics);
        renderTracingGuide(graphics);
        renderPlacedSymbols(graphics);
        renderStrokes(graphics, session.snapshot().selectedPage().strokes(), INK);
        renderStroke(graphics, session.activeStroke(), ACTIVE_INK);
        renderSelection(graphics);
        refreshRecognition();

        graphics.drawCenteredString(font, title, width / 2, 9, 0xFFF6E8BF);
        Component pageLabel = Component.translatable(
                "screen.witch_hat_magic.page_count",
                session.snapshot().selectedPageIndex() + 1,
                session.snapshot().pages().size());
        graphics.drawCenteredString(font, pageLabel, width / 2, 21, 0xFFD9B875);

        if (workshopShell) {
            renderWorkshopPanel(graphics, mouseX, mouseY);
        }
        if (pageIndexOpen) {
            renderPageIndex(graphics, mouseX, mouseY);
        }

        updateButtonStates();
        super.render(graphics, mouseX, mouseY, partialTick);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (pageIndexOpen) {
            int pageIndex = pageIndexAt(mouseX, mouseY);
            if (button == 0 && pageIndex >= 0) {
                session.selectPage(pageIndex);
                syncPageIndexSelection();
                return true;
            }
            return super.mouseClicked(mouseX, mouseY, button);
        }
        if (workshopShell && button == 0) {
            if (handleGuideControl(mouseX, mouseY)) {
                return true;
            }
            MagicSymbolCatalog.Entry entry = catalogEntryAt(mouseX, mouseY);
            if (entry != null) {
                armedSymbolId = entry.id();
                return true;
            }
        }
        if (workshopShell && button == 1 && isPointerInsidePage(mouseX, mouseY)) {
            NormalizedPoint point = pagePoint(mouseX, mouseY);
            if (isOnSelectionResizeHandle(mouseX, mouseY)) {
                rightGesture = RightGesture.RESIZE;
                SymbolSelection.Bounds bounds = session.selectedSymbolBounds();
                lastResizeDistance = bounds == null
                        ? 0.0
                        : distance(point.x(), point.y(), bounds.centerX(), bounds.centerY());
            } else if (session.selectSymbolAt(point)) {
                rightGesture = RightGesture.MOVE;
                rightMoveAnchor = point;
            } else {
                rightGesture = RightGesture.MARQUEE;
                rightStart = point;
                rightCurrent = point;
            }
            return true;
        }
        if (button == 0 && isPointerInsidePage(mouseX, mouseY)) {
            double logicalX = unzoom(mouseX, canvasLeft + canvasDiameter / 2.0);
            double logicalY = unzoom(mouseY, canvasTop + canvasDiameter / 2.0);
            if (workshopShell && armedSymbolId != null) {
                session.placeSymbol(
                        armedSymbolId,
                        pagePoint(mouseX, mouseY),
                        Math.clamp(
                                DEFAULT_SYMBOL_SIZE / (float) canvasDiameter,
                                NotebookLimits.MIN_SYMBOL_SIZE,
                                0.35F));
            } else if (tool == Tool.ERASER) {
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
        if (button == 1 && rightGesture != RightGesture.NONE) {
            NormalizedPoint point = pagePoint(mouseX, mouseY);
            if (rightGesture == RightGesture.MARQUEE) {
                rightCurrent = point;
            } else if (rightGesture == RightGesture.MOVE && rightMoveAnchor != null) {
                float deltaX = point.x() - rightMoveAnchor.x();
                float deltaY = point.y() - rightMoveAnchor.y();
                if (session.moveSelection(deltaX, deltaY)) {
                    rightMoveAnchor = point;
                }
            } else if (rightGesture == RightGesture.RESIZE) {
                SymbolSelection.Bounds bounds = session.selectedSymbolBounds();
                if (bounds != null && lastResizeDistance > 0.0) {
                    double currentDistance = distance(
                            point.x(), point.y(), bounds.centerX(), bounds.centerY());
                    float scale = (float) (currentDistance / lastResizeDistance);
                    if (session.resizeSelection(scale)) {
                        lastResizeDistance = currentDistance;
                    }
                }
            }
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
        if (button == 1 && rightGesture != RightGesture.NONE) {
            if (rightGesture == RightGesture.MARQUEE
                    && rightStart != null
                    && rightCurrent != null) {
                session.selectSymbolsInBox(rightStart, rightCurrent);
            }
            clearRightGesture();
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
        if (pageIndexOpen && verticalAmount != 0.0) {
            int visibleRows = visiblePageRows();
            pageIndexScroll = Math.clamp(
                    pageIndexScroll - (int) Math.signum(verticalAmount),
                    0,
                    Math.max(0, session.snapshot().pages().size() - visibleRows));
            return true;
        }
        if (isPointerInsidePage(mouseX, mouseY) && verticalAmount != 0.0) {
            viewZoom = Math.clamp(viewZoom + Math.signum(verticalAmount) * 0.1, 0.75, 1.75);
            return true;
        }
        if (workshopShell && isInsideCatalog(mouseX, mouseY) && verticalAmount != 0.0) {
            int visibleRows = visibleCatalogRows();
            int totalRows = (MagicSymbolCatalog.entries().size() + CATALOG_COLUMNS - 1)
                    / CATALOG_COLUMNS;
            catalogScrollRow = Math.clamp(
                    catalogScrollRow - (int) Math.signum(verticalAmount),
                    0,
                    Math.max(0, totalRows - visibleRows));
            return true;
        }
        return super.mouseScrolled(mouseX, mouseY, horizontalAmount, verticalAmount);
    }

    @Override
    public boolean keyPressed(int keyCode, int scanCode, int modifiers) {
        if (pageIndexOpen && keyCode == GLFW.GLFW_KEY_ENTER) {
            applyPageRename();
            return true;
        }
        if (pageIndexOpen && keyCode == GLFW.GLFW_KEY_ESCAPE) {
            setPageIndexOpen(false);
            return true;
        }
        if (workshopShell
                && (keyCode == GLFW.GLFW_KEY_DELETE || keyCode == GLFW.GLFW_KEY_BACKSPACE)
                && session.deleteSelection()) {
            return true;
        }
        if (keyCode == GLFW.GLFW_KEY_ESCAPE && armedSymbolId != null) {
            armedSymbolId = null;
            return true;
        }
        return super.keyPressed(keyCode, scanCode, modifiers);
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
        int contentLeft = workshopShell ? CATALOG_WIDTH + 8 : 0;
        int availableWidth = Math.max(48, width - contentLeft - 16);
        canvasDiameter = Math.max(48, Math.min(availableWidth, availableHeight));
        canvasLeft = contentLeft + (width - contentLeft - canvasDiameter) / 2;
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

    private void renderPlacedSymbols(GuiGraphics graphics) {
        List<PlacedSymbol> symbols = session.snapshot().selectedPage().symbols();
        for (PlacedSymbol symbol : symbols) {
            renderPlacedSymbol(graphics, symbol, 1.0F);
        }
    }

    private void renderTracingGuide(GuiGraphics graphics) {
        TracingGuide guide = session.snapshot().selectedPage().guide().orElse(null);
        if (guide == null || !guide.visible()) {
            return;
        }
        var source = session.guideSourcePage().orElse(null);
        if (source == null) {
            return;
        }

        int alpha = Math.clamp(Math.round(guide.opacity() * 255.0F), 0, 255);
        int guideInk = alpha << 24 | 0x005B7691;
        for (NotebookStroke stroke : source.strokes()) {
            List<NormalizedPoint> projected = stroke.points().stream()
                    .map(point -> GuideProjection.project(point, guide))
                    .toList();
            renderStroke(graphics, projected, guideInk);
        }
        for (PlacedSymbol symbol : source.symbols()) {
            PlacedSymbol projected = new PlacedSymbol(
                    symbol.symbolId(),
                    GuideProjection.project(symbol.center(), guide),
                    GuideProjection.projectSize(symbol.size(), guide),
                    symbol.rotationDegrees());
            renderPlacedSymbol(graphics, projected, guide.opacity());
        }
    }

    private void renderPlacedSymbol(
            GuiGraphics graphics,
            PlacedSymbol symbol,
            float opacity) {
        int size = Math.max(8, (int) Math.round(symbol.size() * canvasDiameter * viewZoom));
        int centerX = screenX(symbol.center().x());
        int centerY = screenY(symbol.center().y());
        ResourceLocation texture = symbolTexture(symbol.symbolId());
        graphics.setColor(1.0F, 1.0F, 1.0F, opacity);
        graphics.pose().pushPose();
        graphics.pose().translate(centerX, centerY, 0.0);
        graphics.pose().mulPose(Axis.ZP.rotationDegrees(symbol.rotationDegrees()));
        graphics.blit(texture, -size / 2, -size / 2, 0.0F, 0.0F, size, size, 48, 48);
        graphics.pose().popPose();
        graphics.setColor(1.0F, 1.0F, 1.0F, 1.0F);
    }

    private void renderSelection(GuiGraphics graphics) {
        SymbolSelection.Bounds bounds = session.selectedSymbolBounds();
        if (bounds != null) {
            int left = screenX(bounds.minX());
            int top = screenY(bounds.minY());
            int right = screenX(bounds.maxX());
            int bottom = screenY(bounds.maxY());
            graphics.renderOutline(left, top, right - left, bottom - top, SELECTION);
            drawHandle(graphics, left, top);
            drawHandle(graphics, right, top);
            drawHandle(graphics, left, bottom);
            drawHandle(graphics, right, bottom);
        }
        if (rightGesture == RightGesture.MARQUEE
                && rightStart != null
                && rightCurrent != null) {
            int left = screenX(Math.min(rightStart.x(), rightCurrent.x()));
            int top = screenY(Math.min(rightStart.y(), rightCurrent.y()));
            int right = screenX(Math.max(rightStart.x(), rightCurrent.x()));
            int bottom = screenY(Math.max(rightStart.y(), rightCurrent.y()));
            graphics.fill(left, top, right, bottom, 0x304BA8D8);
            graphics.renderOutline(left, top, right - left, bottom - top, SELECTION);
        }
    }

    private void renderWorkshopPanel(GuiGraphics graphics, int mouseX, int mouseY) {
        int panelTop = 31;
        int panelBottom = height - 50;
        graphics.fill(3, panelTop, CATALOG_WIDTH + 3, panelBottom, 0xF026344A);
        graphics.renderOutline(
                3, panelTop, CATALOG_WIDTH, panelBottom - panelTop, 0xFFD9B875);
        graphics.drawCenteredString(
                font,
                Component.translatable("screen.witch_hat_magic.catalog"),
                CATALOG_WIDTH / 2 + 3,
                panelTop + 6,
                0xFFF6E8BF);

        int start = catalogScrollRow * CATALOG_COLUMNS;
        int visible = visibleCatalogRows() * CATALOG_COLUMNS;
        int end = Math.min(MagicSymbolCatalog.entries().size(), start + visible);
        for (int index = start; index < end; index++) {
            int local = index - start;
            int column = local % CATALOG_COLUMNS;
            int row = local / CATALOG_COLUMNS;
            int x = 9 + column * CATALOG_CELL;
            int y = panelTop + 19 + row * CATALOG_ROW_HEIGHT;
            MagicSymbolCatalog.Entry entry = MagicSymbolCatalog.entries().get(index);
            boolean active = entry.id().equals(armedSymbolId);
            boolean hovered = mouseX >= x
                    && mouseX < x + 30
                    && mouseY >= y
                    && mouseY < y + 34;
            graphics.fill(x, y, x + 30, y + 34, active ? 0xFF5B7691 : 0xFFEEE0B8);
            graphics.renderOutline(x, y, 30, 34, hovered ? SELECTION : 0xFF9D7440);
            graphics.blit(
                    symbolTexture(entry.id()),
                    x + 3,
                    y + 2,
                    0.0F,
                    0.0F,
                    24,
                    24,
                    48,
                    48);
            graphics.drawCenteredString(
                    font,
                    entry.id().substring(0, Math.min(3, entry.id().length())).toUpperCase(),
                    x + 15,
                    y + 25,
                    active ? 0xFFF6E8BF : INK);
        }

        String label = armedSymbolId == null
                ? Component.translatable("screen.witch_hat_magic.catalog_hint").getString()
                : localizedSymbolName(armedSymbolId);
        graphics.drawCenteredString(
                font,
                font.plainSubstrByWidth(label, CATALOG_WIDTH - 10),
                CATALOG_WIDTH / 2 + 3,
                panelBottom - 46,
                0xFFD9B875);

        Component recognitionLabel = activationFeedback == null
                ? recognitionSummary(lastRecognition)
                : activationFeedback;
        graphics.drawCenteredString(
                font,
                font.plainSubstrByWidth(recognitionLabel.getString(), CATALOG_WIDTH - 10),
                CATALOG_WIDTH / 2 + 3,
                panelBottom - 58,
                lastRecognition.activatable() ? 0xFF9ED5A6 : 0xFFE6B47A);

        String guideLabel = session.guideSourcePage()
                .map(source -> Component.translatable(
                                session.snapshot().selectedPage().guide()
                                                .map(TracingGuide::visible)
                                                .orElse(false)
                                        ? "screen.witch_hat_magic.guide"
                                        : "screen.witch_hat_magic.guide_hidden",
                                source.title())
                        .getString())
                .orElseGet(() -> Component.translatable("screen.witch_hat_magic.no_guide")
                        .getString());
        graphics.drawCenteredString(
                font,
                font.plainSubstrByWidth(guideLabel, CATALOG_WIDTH - 10),
                CATALOG_WIDTH / 2 + 3,
                panelBottom - 34,
                0xFFF6E8BF);
        renderGuideControl(graphics, 7, panelBottom - 20, "O");
        renderGuideControl(graphics, 34, panelBottom - 20, "<");
        renderGuideControl(graphics, 61, panelBottom - 20, "-");
        renderGuideControl(graphics, 88, panelBottom - 20, "+");
    }

    private MagicSymbolCatalog.Entry catalogEntryAt(double mouseX, double mouseY) {
        int panelTop = 31;
        int rowAreaTop = panelTop + 19;
        if (mouseX < 9
                || mouseX >= 9 + CATALOG_COLUMNS * CATALOG_CELL
                || mouseY < rowAreaTop
                || mouseY >= rowAreaTop + visibleCatalogRows() * CATALOG_ROW_HEIGHT) {
            return null;
        }
        int column = (int) (mouseX - 9) / CATALOG_CELL;
        int row = (int) (mouseY - rowAreaTop) / CATALOG_ROW_HEIGHT;
        if (row >= visibleCatalogRows()) {
            return null;
        }
        int index = (catalogScrollRow + row) * CATALOG_COLUMNS + column;
        if (index < 0 || index >= MagicSymbolCatalog.entries().size()) {
            return null;
        }
        return MagicSymbolCatalog.entries().get(index);
    }

    private int visibleCatalogRows() {
        return Math.max(1, (height - 182) / CATALOG_ROW_HEIGHT);
    }

    private boolean isInsideCatalog(double mouseX, double mouseY) {
        int rowAreaTop = 50;
        return mouseX >= 3
                && mouseX <= CATALOG_WIDTH + 3
                && mouseY >= rowAreaTop
                && mouseY < rowAreaTop + visibleCatalogRows() * CATALOG_ROW_HEIGHT;
    }

    private void renderGuideControl(GuiGraphics graphics, int x, int y, String label) {
        graphics.fill(x, y, x + 24, y + 16, 0xFFEEE0B8);
        graphics.renderOutline(x, y, 24, 16, 0xFF9D7440);
        graphics.drawCenteredString(font, label, x + 12, y + 4, INK);
    }

    private boolean handleGuideControl(double mouseX, double mouseY) {
        int y = height - 70;
        if (mouseY < y || mouseY >= y + 16) {
            return false;
        }
        if (mouseX >= 7 && mouseX < 31) {
            session.toggleGuide();
            return true;
        }
        if (mouseX >= 34 && mouseX < 58) {
            session.cycleGuideSource(-1);
            return true;
        }
        if (mouseX >= 61 && mouseX < 85) {
            session.resizeGuide(-0.1F);
            return true;
        }
        if (mouseX >= 88 && mouseX < 112) {
            session.resizeGuide(0.1F);
            return true;
        }
        return false;
    }

    private String localizedSymbolName(String id) {
        boolean french = Minecraft.getInstance()
                .getLanguageManager()
                .getSelected()
                .equals("fr_fr");
        return MagicSymbolCatalog.entries().stream()
                .filter(entry -> entry.id().equals(id))
                .findFirst()
                .map(entry -> french ? entry.frenchName() : entry.englishName())
                .orElse(id);
    }

    private static ResourceLocation symbolTexture(String id) {
        return ResourceLocation.fromNamespaceAndPath(
                "witch_hat_magic", "textures/symbol/" + id + ".png");
    }

    private static void drawHandle(GuiGraphics graphics, int x, int y) {
        graphics.fill(x - 3, y - 3, x + 4, y + 4, 0xFFF6E8BF);
        graphics.renderOutline(x - 3, y - 3, 7, 7, SELECTION);
    }

    private boolean isOnSelectionResizeHandle(double mouseX, double mouseY) {
        SymbolSelection.Bounds bounds = session.selectedSymbolBounds();
        if (bounds == null) {
            return false;
        }
        int left = screenX(bounds.minX());
        int top = screenY(bounds.minY());
        int right = screenX(bounds.maxX());
        int bottom = screenY(bounds.maxY());
        return near(mouseX, mouseY, left, top)
                || near(mouseX, mouseY, right, top)
                || near(mouseX, mouseY, left, bottom)
                || near(mouseX, mouseY, right, bottom);
    }

    private static boolean near(double x, double y, int targetX, int targetY) {
        return Math.abs(x - targetX) <= 6.0 && Math.abs(y - targetY) <= 6.0;
    }

    private NormalizedPoint pagePoint(double mouseX, double mouseY) {
        double logicalX = unzoom(mouseX, canvasLeft + canvasDiameter / 2.0);
        double logicalY = unzoom(mouseY, canvasTop + canvasDiameter / 2.0);
        return new NormalizedPoint(
                (float) ((logicalX - canvasLeft) / canvasDiameter),
                (float) ((logicalY - canvasTop) / canvasDiameter));
    }

    private void clearRightGesture() {
        rightGesture = RightGesture.NONE;
        rightStart = null;
        rightCurrent = null;
        rightMoveAnchor = null;
        lastResizeDistance = 0.0;
    }

    private static double distance(double x1, double y1, double x2, double y2) {
        return Math.hypot(x1 - x2, y1 - y2);
    }

    private void renderPageIndex(GuiGraphics graphics, int mouseX, int mouseY) {
        int left = Math.max(8, width / 2 - 120);
        int top = Math.max(38, height / 2 - 92);
        int panelHeight = Math.min(184, height - top - 52);
        graphics.fill(left, top, left + 240, top + panelHeight, 0xFA26344A);
        graphics.renderOutline(left, top, 240, panelHeight, 0xFFD9B875);
        graphics.drawCenteredString(
                font,
                Component.translatable("screen.witch_hat_magic.page_index"),
                left + 120,
                top + 8,
                0xFFF6E8BF);

        int rows = visiblePageRows();
        int end = Math.min(session.snapshot().pages().size(), pageIndexScroll + rows);
        for (int index = pageIndexScroll; index < end; index++) {
            int row = index - pageIndexScroll;
            int y = top + 72 + row * 18;
            boolean selected = index == session.snapshot().selectedPageIndex();
            boolean hovered = mouseX >= left + 10
                    && mouseX < left + 230
                    && mouseY >= y
                    && mouseY < y + 16;
            graphics.fill(
                    left + 10,
                    y,
                    left + 230,
                    y + 16,
                    selected ? 0xFF5B7691 : hovered ? 0xFF41556E : 0xFFEEE0B8);
            graphics.drawString(
                    font,
                    (index + 1) + ". " + font.plainSubstrByWidth(
                            session.snapshot().pages().get(index).title(), 190),
                    left + 15,
                    y + 4,
                    selected ? 0xFFF6E8BF : INK,
                    false);
        }
    }

    private int pageIndexAt(double mouseX, double mouseY) {
        int left = Math.max(8, width / 2 - 120);
        int top = Math.max(38, height / 2 - 92);
        if (mouseX < left + 10
                || mouseX >= left + 230
                || mouseY < top + 72
                || mouseY >= top + 72 + visiblePageRows() * 18) {
            return -1;
        }
        int index = pageIndexScroll + (int) (mouseY - top - 72) / 18;
        return index < session.snapshot().pages().size() ? index : -1;
    }

    private int visiblePageRows() {
        int top = Math.max(38, height / 2 - 92);
        int panelHeight = Math.min(184, height - top - 52);
        return Math.max(1, (panelHeight - 76) / 18);
    }

    private void setPageIndexOpen(boolean open) {
        pageIndexOpen = open;
        if (open) {
            armedSymbolId = null;
            clearRightGesture();
            syncPageIndexSelection();
        }
        updatePageWidgetVisibility();
    }

    private void syncPageIndexSelection() {
        if (pageTitleBox == null) {
            return;
        }
        pageTitleBox.setValue(session.snapshot().selectedPage().title());
        int visibleRows = visiblePageRows();
        int selected = session.snapshot().selectedPageIndex();
        if (selected < pageIndexScroll) {
            pageIndexScroll = selected;
        } else if (selected >= pageIndexScroll + visibleRows) {
            pageIndexScroll = selected - visibleRows + 1;
        }
    }

    private void applyPageRename() {
        if (pageTitleBox == null) {
            return;
        }
        try {
            session.renamePage(pageTitleBox.getValue());
            syncPageIndexSelection();
        } catch (IllegalArgumentException exception) {
            pageTitleBox.setValue(session.snapshot().selectedPage().title());
        }
    }

    private void updatePageWidgetVisibility() {
        if (pageTitleBox == null) {
            return;
        }
        pageTitleBox.setVisible(pageIndexOpen);
        renamePageButton.visible = pageIndexOpen;
        duplicatePageButton.visible = pageIndexOpen;
        movePageLeftButton.visible = pageIndexOpen;
        movePageRightButton.visible = pageIndexOpen;
        closePagesButton.visible = pageIndexOpen;
        if (activationButton != null) {
            activationButton.visible = workshopShell && !pageIndexOpen;
        }
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
        pagesButton.active = !pageIndexOpen;
        if (renamePageButton != null) {
            duplicatePageButton.active = session.snapshot().pages().size() < NotebookLimits.MAX_PAGES;
            movePageLeftButton.active = session.snapshot().selectedPageIndex() > 0;
            movePageRightButton.active = session.snapshot().selectedPageIndex() + 1
                    < session.snapshot().pages().size();
        }
        if (activationButton != null) {
            activationButton.active = lastRecognition.activatable()
                    && ClientPlayNetworking.canSend(ActivateSpellPayload.TYPE);
        }
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

    private void sendActivation() {
        sendSave();
        if (!ClientPlayNetworking.canSend(ActivateSpellPayload.TYPE)) {
            return;
        }
        String pageId = session.snapshot().selectedPageId();
        activationFeedback = Component.translatable(
                "screen.witch_hat_magic.activation.pending");
        ClientPlayNetworking.send(new ActivateSpellPayload(hand, pageId));
    }

    private void refreshRecognition() {
        RecognizedSpell recognized = SpellRecognizer.recognize(
                session.snapshot().selectedPage());
        if (!recognized.equals(lastRecognition)) {
            lastRecognition = recognized;
            activationFeedback = null;
        }
    }

    private Component recognitionSummary(RecognizedSpell recognized) {
        String key = ActivationFeedback.recognitionKey(recognized.status());
        if (!recognized.activatable()) {
            return Component.translatable(key);
        }
        String sigils = recognized.sigilIds().stream()
                .map(this::localizedSymbolName)
                .reduce((left, right) -> left + " + " + right)
                .orElse("");
        return Component.translatable(key, sigils, recognized.signIds().size());
    }

    private enum Tool {
        PEN,
        ERASER
    }

    private enum RightGesture {
        NONE,
        MARQUEE,
        MOVE,
        RESIZE
    }
}
