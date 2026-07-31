package io.github.nh1980mg.witchhat.magic.body;

import java.util.Locale;

/** Paintable body parts for forbidden body ink — the manga's forbidden tattoos. */
public enum BodyPart {
    HEAD,
    TORSO,
    LEFT_ARM,
    RIGHT_ARM,
    LEFT_LEG,
    RIGHT_LEG;

    public String id() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static BodyPart byId(String id) {
        for (BodyPart part : values()) {
            if (part.id().equals(id)) {
                return part;
            }
        }
        return null;
    }
}
