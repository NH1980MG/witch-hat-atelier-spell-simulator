const DEFAULT_COLOR = "#8c6b3f";

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function safeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : DEFAULT_COLOR;
}

function escapeXml(value) {
  return String(value || "?").replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

function actionBounds(action) {
  if (action?.type === "free" && Array.isArray(action.points) && action.points.length > 0) {
    const xs = action.points.map((point) => safeNumber(point.x));
    const ys = action.points.map((point) => safeNumber(point.y));
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  }
  if (action?.type === "annotation" && action.kind === "drawing" && Array.isArray(action.points) && action.points.length > 0) {
    const xs = action.points.map((point) => safeNumber(point.x));
    const ys = action.points.map((point) => safeNumber(point.y));
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  }
  if (action?.type === "annotation" && action.kind === "text") {
    const size = Math.max(12, Math.abs(safeNumber(action.size, 18)));
    const x = safeNumber(action.x);
    const y = safeNumber(action.y);
    const width = Math.max(size, String(action.text || "").length * size * 0.58);
    return { left: x, right: x + width, top: y - size, bottom: y + size * 0.25 };
  }
  if (["circle", "ring", "spiral"].includes(action?.type)) {
    const radius = Math.max(1, Math.abs(safeNumber(action.radius, 1)));
    const cx = safeNumber(action.cx);
    const cy = safeNumber(action.cy);
    return { left: cx - radius, right: cx + radius, top: cy - radius, bottom: cy + radius };
  }
  if (action?.type === "ray") {
    return {
      left: Math.min(safeNumber(action.cx), safeNumber(action.x)),
      right: Math.max(safeNumber(action.cx), safeNumber(action.x)),
      top: Math.min(safeNumber(action.cy), safeNumber(action.y)),
      bottom: Math.max(safeNumber(action.cy), safeNumber(action.y)),
    };
  }
  if (action?.type === "glyph") {
    const size = Math.max(4, Math.abs(safeNumber(action.size, 12)));
    const x = safeNumber(action.x);
    const y = safeNumber(action.y);
    return { left: x - size, right: x + size, top: y - size, bottom: y + size };
  }
  return null;
}

function mergeBounds(actions) {
  const bounds = actions.map(actionBounds).filter(Boolean);
  if (bounds.length === 0) return null;
  return {
    left: Math.min(...bounds.map((item) => item.left)),
    right: Math.max(...bounds.map((item) => item.right)),
    top: Math.min(...bounds.map((item) => item.top)),
    bottom: Math.max(...bounds.map((item) => item.bottom)),
  };
}

function actionMarkup(action) {
  const color = safeColor(action.color);
  const width = Math.max(1, Math.min(12, safeNumber(action.width, 2)));
  const line = `fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;
  if (action.type === "free" && Array.isArray(action.points)) {
    const points = action.points.map((point) => `${safeNumber(point.x)},${safeNumber(point.y)}`).join(" ");
    return `<polyline points="${points}" ${line}/>`;
  }
  if (action.type === "annotation" && action.kind === "drawing" && Array.isArray(action.points)) {
    const points = action.points.map((point) => `${safeNumber(point.x)},${safeNumber(point.y)}`).join(" ");
    return `<polyline points="${points}" ${line} stroke-dasharray="3 4"/>`;
  }
  if (action.type === "annotation" && action.kind === "text") {
    const x = safeNumber(action.x);
    const y = safeNumber(action.y);
    const size = Math.max(12, Math.abs(safeNumber(action.size, 18)));
    const label = escapeXml(action.text || "");
    return `<text x="${x}" y="${y}" font-family="Georgia,serif" font-size="${size}" fill="${color}" text-decoration="underline">${label}</text>`;
  }
  if (["circle", "ring"].includes(action.type)) {
    const rings = action.type === "ring" ? [1, 0.72, 0.46] : [1];
    const circles = rings.map((factor) => `<circle cx="${safeNumber(action.cx)}" cy="${safeNumber(action.cy)}" r="${Math.max(1, Math.abs(safeNumber(action.radius, 1)) * factor)}" ${line}/>`).join("");
    return circles;
  }
  if (action.type === "ray") {
    return `<line x1="${safeNumber(action.cx)}" y1="${safeNumber(action.cy)}" x2="${safeNumber(action.x)}" y2="${safeNumber(action.y)}" ${line}/>`;
  }
  if (action.type === "spiral") {
    const points = [];
    const turns = Math.max(1, Math.min(8, safeNumber(action.turns, 3)));
    const radius = Math.max(1, Math.abs(safeNumber(action.radius, 1)));
    for (let step = 0; step < 36; step += 1) {
      const progress = step / 35;
      const angle = progress * Math.PI * 2 * turns;
      points.push(`${safeNumber(action.cx) + Math.cos(angle) * radius * progress},${safeNumber(action.cy) + Math.sin(angle) * radius * progress}`);
    }
    return `<polyline points="${points.join(" ")}" ${line}/>`;
  }
  if (action.type === "glyph") {
    const size = Math.max(4, Math.abs(safeNumber(action.size, 12)));
    const label = escapeXml(action.rune || action.element?.slice(0, 2) || "?");
    return `<circle cx="${safeNumber(action.x)}" cy="${safeNumber(action.y)}" r="${size}" ${line}/><text x="${safeNumber(action.x)}" y="${safeNumber(action.y) + size * 0.34}" text-anchor="middle" font-family="Georgia,serif" font-size="${Math.max(7, size * 0.7)}" fill="${color}">${label}</text>`;
  }
  return "";
}

export function buildSpellPreviewDataUrl(actions = []) {
  const usableActions = Array.isArray(actions) ? actions.filter((action) => action && action.type) : [];
  const bounds = mergeBounds(usableActions);
  if (!bounds) return null;
  const padding = 16;
  const left = bounds.left - padding;
  const top = bounds.top - padding;
  const width = Math.max(40, bounds.right - bounds.left + padding * 2);
  const height = Math.max(40, bounds.bottom - bounds.top + padding * 2);
  const markup = usableActions.map(actionMarkup).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}"><rect width="100%" height="100%" fill="#fffaf0"/>${markup}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
