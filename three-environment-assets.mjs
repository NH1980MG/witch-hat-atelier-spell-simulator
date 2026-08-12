export const THREE_ENVIRONMENT_ASSETS = [
  {
    id: "lightHouse",
    label: "Light workshop house",
    path: "assets/3d/environment/light-house.glb",
    source: "local-glb-or-procedural-fallback",
    fallbackBuilder: "buildLightHouseProp",
    scaleMeters: 1,
    dimensions: {
      widthMeters: 3.4,
      heightMeters: 3.1,
      depthMeters: 3.0,
    },
    reactionStates: ["idle", "sway", "roof-lift", "uprooted"],
  },
  {
    id: "windTree",
    label: "Flexible tree",
    path: "assets/3d/environment/wind-tree.glb",
    source: "local-glb-or-procedural-fallback",
    fallbackBuilder: "buildWindTreeProp",
    scaleMeters: 1,
    dimensions: {
      widthMeters: 1.5,
      heightMeters: 4.1,
      depthMeters: 1.5,
    },
    reactionStates: ["idle", "sway", "bend", "uprooted"],
  },
  {
    id: "woodCrate",
    label: "Wood crate",
    path: "assets/3d/environment/wood-crate.glb",
    source: "local-glb-or-procedural-fallback",
    fallbackBuilder: "buildWoodCrateProp",
    scaleMeters: 1,
    dimensions: {
      widthMeters: 0.9,
      heightMeters: 0.9,
      depthMeters: 0.9,
    },
    reactionStates: ["idle", "slide", "tip", "splinter"],
  },
  {
    id: "fieldStone",
    label: "Field stone",
    path: "assets/3d/environment/field-stone.glb",
    source: "local-glb-or-procedural-fallback",
    fallbackBuilder: "buildFieldStoneProp",
    scaleMeters: 1,
    dimensions: {
      widthMeters: 0.8,
      heightMeters: 0.42,
      depthMeters: 0.7,
    },
    reactionStates: ["idle", "nudge", "roll", "crack"],
  },
  {
    id: "grassDust",
    label: "Grass and dust patch",
    path: "assets/3d/environment/grass-dust.glb",
    source: "local-glb-or-procedural-fallback",
    fallbackBuilder: "buildGrassDustPatch",
    scaleMeters: 1,
    dimensions: {
      widthMeters: 4.5,
      heightMeters: 0.18,
      depthMeters: 4.5,
    },
    reactionStates: ["idle", "ripple", "dust-puff", "scorched"],
  },
];

export function environmentAssetManifest() {
  return THREE_ENVIRONMENT_ASSETS.map((asset) => ({
    ...asset,
    dimensions: { ...asset.dimensions },
    reactionStates: [...asset.reactionStates],
  }));
}

export function resolveEnvironmentAsset(id) {
  return environmentAssetManifest().find((asset) => asset.id === id) || null;
}

export function environmentAssetFallback(id) {
  return resolveEnvironmentAsset(id)?.fallbackBuilder || null;
}
