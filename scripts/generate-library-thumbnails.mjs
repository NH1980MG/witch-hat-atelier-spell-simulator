import { mkdir, writeFile } from "node:fs/promises";
import { LIBRARY_CIRCLES } from "../library-circle-data.mjs";

const outputDirectory = new URL("../assets/library-schematics/", import.meta.url);

function point(radius, angle) {
  return [120 + Math.cos(angle) * radius, 120 + Math.sin(angle) * radius];
}

function centerMark(seed) {
  const variant = seed % 4;
  if (variant === 0) return '<path d="M92 120 Q120 82 148 120 Q120 158 92 120 Z M106 120 Q120 104 134 120 Q120 136 106 120 Z"/>';
  if (variant === 1) return '<path d="M120 88 L146 120 L120 152 L94 120 Z M120 100 L120 140 M104 120 L136 120"/>';
  if (variant === 2) return '<path d="M101 140 C90 118 105 96 124 106 C144 116 136 143 116 139 C101 136 101 119 114 116 C126 113 132 125 125 132"/>';
  return '<polygon points="120,89 130,108 152,111 136,127 140,150 120,139 100,150 104,127 88,111 110,108"/>';
}

function modifierMarks(seed) {
  const count = 4 + (seed % 5);
  const marks = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + seed * 0.17;
    const [x1, y1] = point(68, angle);
    const [x2, y2] = point(88, angle);
    const tangent = angle + Math.PI / 2;
    const wing = 8 + (seed % 4);
    marks.push(`<polyline points="${(x1 + Math.cos(tangent) * wing).toFixed(1)},${(y1 + Math.sin(tangent) * wing).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${(x1 - Math.cos(tangent) * wing).toFixed(1)},${(y1 - Math.sin(tangent) * wing).toFixed(1)}"/>`);
  }
  return marks.join("");
}

export function renderCircleSvg(circle) {
  const innerRadius = 78 - (circle.seed % 3) * 5;
  const spokes = Array.from({ length: 3 + (circle.seed % 4) }, (_, index) => {
    const angle = (index / (3 + (circle.seed % 4))) * Math.PI * 2 + circle.seed * 0.09;
    const [x1, y1] = point(30, angle);
    const [x2, y2] = point(innerRadius - 8, angle);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img">
<title>${circle.alt.en}</title>
<path fill="#fffaf0" stroke="none" d="M0 0H240V240H0Z"/>
<g fill="none" stroke="#7d1f1a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke">
<circle cx="120" cy="120" r="104"/><circle cx="120" cy="120" r="${innerRadius}"/><circle cx="120" cy="120" r="34"/>
${spokes}${modifierMarks(circle.seed)}${centerMark(circle.seed)}
</g></svg>`;
}

await mkdir(outputDirectory, { recursive: true });
for (const circle of LIBRARY_CIRCLES) {
  await writeFile(new URL(`${circle.id}.svg`, outputDirectory), renderCircleSvg(circle), "utf8");
}
