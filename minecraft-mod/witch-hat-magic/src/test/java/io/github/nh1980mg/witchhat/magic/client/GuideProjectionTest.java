package io.github.nh1980mg.witchhat.magic.client;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.TracingGuide;
import org.junit.jupiter.api.Test;

final class GuideProjectionTest {
    @Test
    void projectsPointsAroundTheGuideCenter() {
        TracingGuide guide = new TracingGuide(
                "source",
                new NormalizedPoint(0.6F, 0.4F),
                0.5F,
                0.35F,
                true);

        NormalizedPoint projected = GuideProjection.project(
                new NormalizedPoint(0.25F, 0.75F), guide);

        assertEquals(0.475F, projected.x(), 0.0001F);
        assertEquals(0.525F, projected.y(), 0.0001F);
    }

    @Test
    void scalesSymbolSizesWithTheGuide() {
        TracingGuide guide = TracingGuide.createDefault("source").withSize(0.65F);

        assertEquals(0.13F, GuideProjection.projectSize(0.2F, guide), 0.0001F);
    }
}
