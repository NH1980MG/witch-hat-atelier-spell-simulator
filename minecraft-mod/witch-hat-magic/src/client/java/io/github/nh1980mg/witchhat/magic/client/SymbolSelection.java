package io.github.nh1980mg.witchhat.magic.client;

import io.github.nh1980mg.witchhat.magic.notebook.NormalizedPoint;
import io.github.nh1980mg.witchhat.magic.notebook.PlacedSymbol;
import java.util.ArrayList;
import java.util.List;

public record SymbolSelection(List<Integer> indices) {
    public SymbolSelection {
        indices = List.copyOf(indices);
    }

    public static SymbolSelection empty() {
        return new SymbolSelection(List.of());
    }

    public static SymbolSelection single(int index) {
        return new SymbolSelection(List.of(index));
    }

    public boolean isEmpty() {
        return indices.isEmpty();
    }

    public Bounds bounds(List<PlacedSymbol> symbols) {
        if (indices.isEmpty()) {
            return null;
        }
        Bounds result = null;
        for (int index : indices) {
            if (index < 0 || index >= symbols.size()) {
                continue;
            }
            Bounds symbolBounds = boundsOf(symbols.get(index));
            result = result == null ? symbolBounds : result.union(symbolBounds);
        }
        return result;
    }

    public static boolean contains(PlacedSymbol symbol, NormalizedPoint point) {
        double radians = Math.toRadians(-symbol.rotationDegrees());
        double dx = point.x() - symbol.center().x();
        double dy = point.y() - symbol.center().y();
        double localX = dx * Math.cos(radians) - dy * Math.sin(radians);
        double localY = dx * Math.sin(radians) + dy * Math.cos(radians);
        double half = symbol.size() / 2.0;
        return Math.abs(localX) <= half && Math.abs(localY) <= half;
    }

    public static SymbolSelection intersecting(
            List<PlacedSymbol> symbols,
            NormalizedPoint start,
            NormalizedPoint end) {
        Bounds marquee = new Bounds(
                Math.min(start.x(), end.x()),
                Math.min(start.y(), end.y()),
                Math.max(start.x(), end.x()),
                Math.max(start.y(), end.y()));
        List<Integer> selected = new ArrayList<>();
        for (int index = 0; index < symbols.size(); index++) {
            if (marquee.intersects(boundsOf(symbols.get(index)))) {
                selected.add(index);
            }
        }
        return new SymbolSelection(selected);
    }

    private static Bounds boundsOf(PlacedSymbol symbol) {
        double radians = Math.toRadians(symbol.rotationDegrees());
        float extent = (float) (symbol.size()
                * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)))
                / 2.0);
        return new Bounds(
                symbol.center().x() - extent,
                symbol.center().y() - extent,
                symbol.center().x() + extent,
                symbol.center().y() + extent);
    }

    public record Bounds(float minX, float minY, float maxX, float maxY) {
        public float centerX() {
            return (minX + maxX) / 2.0F;
        }

        public float centerY() {
            return (minY + maxY) / 2.0F;
        }

        public Bounds union(Bounds other) {
            return new Bounds(
                    Math.min(minX, other.minX),
                    Math.min(minY, other.minY),
                    Math.max(maxX, other.maxX),
                    Math.max(maxY, other.maxY));
        }

        public boolean intersects(Bounds other) {
            return minX <= other.maxX
                    && maxX >= other.minX
                    && minY <= other.maxY
                    && maxY >= other.minY;
        }
    }
}
