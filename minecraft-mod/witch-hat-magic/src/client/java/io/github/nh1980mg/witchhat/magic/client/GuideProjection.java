package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.TracingGuide;

final class GuideProjection {
    private GuideProjection() {}

    static NormalizedPoint project(NormalizedPoint point, TracingGuide guide) {
        return new NormalizedPoint(
                guide.center().x() + (point.x() - 0.5F) * guide.size(),
                guide.center().y() + (point.y() - 0.5F) * guide.size());
    }

    static float projectSize(float size, TracingGuide guide) {
        return size * guide.size();
    }
}
