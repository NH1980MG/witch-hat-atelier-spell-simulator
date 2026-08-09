function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function assessFreehandBoundary(points) {
  if (!Array.isArray(points) || points.length < 24) {
    return { candidate: false, closed: false };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const width = right - left;
  const height = bottom - top;
  const size = Math.max(width, height);
  const ratio = Math.min(width, height) / Math.max(1, size);
  const center = { x: left + width / 2, y: top + height / 2 };
  const radii = points.map((point) => pointDistance(point, center));
  const averageRadius = radii.reduce((total, value) => total + value, 0) / radii.length;
  const radiusVariance = radii.reduce((total, value) => total + Math.abs(value - averageRadius), 0) /
    Math.max(1, averageRadius * radii.length);
  let area = 0;
  let perimeter = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
    perimeter += pointDistance(current, next);
  }
  const circularity = perimeter > 0 ? (4 * Math.PI * Math.abs(area / 2)) / (perimeter * perimeter) : 0;
  const closingDistance = pointDistance(points[0], points[points.length - 1]);
  const candidate = size >= 80 && ratio >= 0.42 && circularity >= 0.34 && radiusVariance <= 0.78;
  const closingLimit = Math.max(10, Math.min(20, size * 0.055));

  return {
    candidate,
    closed: candidate && closingDistance <= closingLimit && closingDistance <= averageRadius * 0.16,
    closingDistance,
    closingLimit,
  };
}

export function recognizedMaterialLabel({ sigilCount, presentationLabel, noneLabel }) {
  return sigilCount > 0 && presentationLabel ? presentationLabel : noneLabel;
}
