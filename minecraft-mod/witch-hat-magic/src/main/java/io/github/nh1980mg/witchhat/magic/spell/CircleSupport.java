package io.github.nh1980mg.witchhat.magic.spell;

public enum CircleSupport {
    NOTEBOOK(1.0),
    CANVAS_SQUARE(1.5),
    LARGE_CANVAS(3.0);

    private final double maxPower;

    CircleSupport(double maxPower) {
        this.maxPower = maxPower;
    }

    public double maxPower() {
        return maxPower;
    }

    public double sizeWeight() {
        return maxPower / 2.0;
    }
}
