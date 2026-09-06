function finite(value, fallback, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fallback));
}

function freezeDeep(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

function randomFor(seed) {
  let hash = 2166136261;
  for (const character of String(seed)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function axis(value) {
  const vector = Array.isArray(value) ? value : [value?.x, value?.y, value?.z];
  const safe = vector.slice(0, 3).map((v) => finite(v, 0, -1, 1));
  while (safe.length < 3) safe.push(0);
  const magnitude = Math.hypot(...safe);
  return magnitude > 0.001 ? safe.map((v) => v / magnitude) : undefined;
}

export function createFlowerManifestationPlan({ spellId = "anonymous", timeline = { stages: [] }, quality = "high", geometry = {}, reducedMotion = false } = {}) {
  const random = randomFor(spellId);
  const reduced = reducedMotion || timeline.reducedMotion === true;
  const bounds = { maxPetals: quality === "high" ? 24 : 12, maxBodies: reduced ? 48 : quality === "high" ? 160 : 72, maxLifetimeMs: reduced ? 1800 : 4200 };
  const stages = timeline.stages || [];
  const has = (id) => stages.some((stage) => stage.id === id);
  const petalCount = Math.round(finite(geometry.petalCount, quality === "high" ? 18 : 10, 5, bounds.maxPetals));
  const outerCount = Math.ceil(petalCount * 0.58);
  const petals = Array.from({ length: petalCount }, (_, index) => {
    const layer = index < outerCount ? 0 : 1;
    const layerCount = layer === 0 ? outerCount : petalCount - outerCount;
    const angle = (layer === 0 ? index : index - outerCount) / layerCount * Math.PI * 2 + layer * 0.3;
    return { id: `petal-${index}`, layer, angle, length: (layer ? 0.65 : 0.96) * (0.94 + random() * 0.12), width: (layer ? 0.24 : 0.32) * (0.92 + random() * 0.16), curve: (layer ? 0.7 : 0.4) + random() * 0.12, growthDelay: layer * 0.14 + random() * 0.12 };
  });
  const targetStage = stages.find(({ id }) => id === "directed-dispersion");
  const targetAxes = targetStage?.targeted && Array.isArray(geometry.targetAxes) ? geometry.targetAxes.slice(0, 16).map(axis).filter(Boolean) : [];
  const releaseAxes = Array.isArray(geometry.releaseAxes) ? geometry.releaseAxes.slice(0, 16).map(axis).filter(Boolean) : [];
  if (targetStage?.targeted && !targetAxes.length) targetAxes.push(axis(geometry.vector) || [0, 1, 0]);
  const fractureStage = stages.find(({ id }) => id === "fracture");
  const perPetal = Math.round(finite(3 + Math.log2(1 + (fractureStage?.strength || 1)), 4, 3, 8));
  const shardCount = fractureStage ? Math.min(bounds.maxBodies, petalCount * perPetal) : 0;
  const shards = Array.from({ length: shardCount }, (_, index) => {
    const petalIndex = index % petalCount;
    const petal = petals[petalIndex];
    const t = 0.18 + (Math.floor(index / petalCount) + random() * 0.55) / perPetal * 0.77;
    const radial = [Math.cos(petal.angle), 0.18, Math.sin(petal.angle)];
    const targetBias = targetAxes.length ? targetAxes[index % targetAxes.length] : [0, 0, 0];
    const release = releaseAxes.length ? releaseAxes[index % releaseAxes.length] : radial;
    const speed = reduced ? 0.24 : 0.85 + random() * 0.7;
    const impulse = release.map((v, i) => targetStage ? (v * (targetAxes.length ? 0.25 : 1) + targetBias[i] * 1.4) * speed : 0);
    return { id: `shard-${index}`, petalIndex, t, position: [Math.cos(petal.angle) * t * petal.length, 0.12 + petal.layer * 0.05 + petal.curve * t * t, Math.sin(petal.angle) * t * petal.length], scale: [0.08 + random() * 0.08, 0.025 + random() * 0.025, 0.04 + random() * 0.04], mass: 0.008 + random() * 0.012, impulse, angularVelocity: reduced ? [0, 0, 0] : [random() * 3 - 1.5, random() * 3 - 1.5, random() * 3 - 1.5], lifetimeMs: Math.round(bounds.maxLifetimeMs * (0.75 + random() * 0.25)), targetBias: [...targetBias] };
  });
  return freezeDeep({ spellId: String(spellId), timeline, reducedMotion: reduced, petals, core: { radius: 0.15, height: 0.12 }, growthScale: stages.find(({ id }) => id === "enlargement")?.scale || 1, materials: { water: { color: "#53bce8", opacity: 0.57, roughness: 0.12 }, crystal: { color: "#c3edff", opacity: 0.94, roughness: 0.24 }, crystalline: has("crystallization") }, fracture: { shards, release: Boolean(targetStage) }, bounds });
}

// Closed, tapered petal along +X. UV.x is the centre-to-tip crystal sweep coordinate.
export function buildPetalGeometryData({ segments = 12, across = 4 } = {}) {
  const rows = Math.round(finite(segments, 12, 4, 24));
  const columns = Math.round(finite(across, 4, 2, 8));
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let side = 0; side < 2; side += 1) {
    for (let row = 0; row <= rows; row += 1) {
      const t = row / rows;
      const width = Math.pow(Math.sin(Math.PI * t), 0.85) * 0.5 + 0.004;
      for (let column = 0; column <= columns; column += 1) {
        const v = column / columns * 2 - 1;
        const ridge = (1 - Math.abs(v)) * Math.sin(Math.PI * t) * (side ? -0.015 : 0.09);
        positions.push(t, t * t + ridge, v * width);
        uvs.push(t, column / columns);
      }
    }
  }
  const stride = columns + 1;
  const surface = (rows + 1) * stride;
  for (let side = 0; side < 2; side += 1) {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const a = side * surface + row * stride + column;
        const faces = [a, a + stride, a + 1, a + 1, a + stride, a + stride + 1];
        indices.push(...(side ? faces.reverse() : faces));
      }
    }
  }
  const edge = [];
  for (let c = 0; c <= columns; c += 1) edge.push(c);
  for (let r = 1; r <= rows; r += 1) edge.push(r * stride + columns);
  for (let c = columns - 1; c >= 0; c -= 1) edge.push(rows * stride + c);
  for (let r = rows - 1; r > 0; r -= 1) edge.push(r * stride);
  for (let i = 0; i < edge.length; i += 1) {
    const a = edge[i], b = edge[(i + 1) % edge.length];
    indices.push(a, b, a + surface, b, b + surface, a + surface);
  }
  return { positions, uvs, indices };
}
