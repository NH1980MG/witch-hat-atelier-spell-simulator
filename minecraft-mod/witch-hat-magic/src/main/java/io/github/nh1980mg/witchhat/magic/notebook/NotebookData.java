package io.github.nh1980mg.witchhat.magic.notebook;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;

public record NotebookData(int formatVersion, String selectedPageId, List<NotebookPage> pages) {
    public static final int CURRENT_FORMAT = 1;

    public static final Codec<NotebookData> CODEC = RecordCodecBuilder.create(instance -> instance.group(
            Codec.INT.fieldOf("format_version").forGetter(NotebookData::formatVersion),
            Codec.STRING.fieldOf("selected_page").forGetter(NotebookData::selectedPageId),
            NotebookPage.CODEC.listOf().fieldOf("pages").forGetter(NotebookData::pages))
            .apply(instance, NotebookData::new));

    public static final StreamCodec<RegistryFriendlyByteBuf, NotebookData> STREAM_CODEC =
            StreamCodec.ofMember(NotebookData::write, NotebookData::read);

    public NotebookData {
        selectedPageId = Objects.requireNonNull(selectedPageId, "selectedPageId");
        pages = List.copyOf(Objects.requireNonNull(pages, "pages"));
    }

    public static NotebookData createDefault() {
        NotebookPage page = NotebookPage.blank("page-1", "Page 1");
        return new NotebookData(CURRENT_FORMAT, page.id(), List.of(page));
    }

    public NotebookPage selectedPage() {
        return pages.stream()
                .filter(page -> page.id().equals(selectedPageId))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Selected notebook page is missing"));
    }

    public NotebookData replaceSelectedPage(NotebookPage replacement) {
        Objects.requireNonNull(replacement, "replacement");
        if (!replacement.id().equals(selectedPageId)) {
            throw new IllegalArgumentException("Replacement page must keep the selected page id");
        }

        List<NotebookPage> changed = new ArrayList<>(pages);
        int selectedIndex = indexOfSelectedPage();
        changed.set(selectedIndex, replacement);
        return new NotebookData(formatVersion, selectedPageId, changed);
    }

    public NotebookData addPage() {
        if (pages.size() >= NotebookLimits.MAX_PAGES) {
            throw new IllegalStateException("Notebook already contains the maximum number of pages");
        }

        int suffix = pages.size() + 1;
        String id;
        do {
            id = "page-" + suffix++;
        } while (containsPage(id));

        NotebookPage page = NotebookPage.blank(id, "Page " + (suffix - 1));
        List<NotebookPage> changed = new ArrayList<>(pages);
        changed.add(page);
        return new NotebookData(formatVersion, page.id(), changed);
    }

    public NotebookData selectPage(int index) {
        if (index < 0 || index >= pages.size()) {
            throw new IndexOutOfBoundsException("Notebook page index: " + index);
        }
        return new NotebookData(formatVersion, pages.get(index).id(), pages);
    }

    public NotebookData removeSelectedPage() {
        if (pages.size() == 1) {
            return this;
        }

        int selectedIndex = indexOfSelectedPage();
        List<NotebookPage> changed = new ArrayList<>(pages);
        changed.remove(selectedIndex);
        int nextIndex = Math.min(selectedIndex, changed.size() - 1);
        return new NotebookData(formatVersion, changed.get(nextIndex).id(), changed);
    }

    public int selectedPageIndex() {
        return indexOfSelectedPage();
    }

    private int indexOfSelectedPage() {
        for (int index = 0; index < pages.size(); index++) {
            if (pages.get(index).id().equals(selectedPageId)) {
                return index;
            }
        }
        throw new IllegalStateException("Selected notebook page is missing");
    }

    private boolean containsPage(String id) {
        return pages.stream().anyMatch(page -> page.id().equals(id));
    }

    private void write(RegistryFriendlyByteBuf buffer) {
        buffer.writeVarInt(formatVersion);
        buffer.writeUtf(selectedPageId, NotebookPage.MAX_ID_LENGTH);
        buffer.writeVarInt(pages.size());
        pages.forEach(page -> NotebookPage.STREAM_CODEC.encode(buffer, page));
    }

    private static NotebookData read(RegistryFriendlyByteBuf buffer) {
        int formatVersion = buffer.readVarInt();
        String selectedPageId = buffer.readUtf(NotebookPage.MAX_ID_LENGTH);
        int count = NotebookStroke.readBoundedCount(buffer, NotebookLimits.MAX_PAGES, "notebook pages");
        List<NotebookPage> pages = new ArrayList<>(count);
        for (int index = 0; index < count; index++) {
            pages.add(NotebookPage.STREAM_CODEC.decode(buffer));
        }
        return NotebookLimits.validate(new NotebookData(formatVersion, selectedPageId, pages));
    }
}
