import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const moduleRoot = new URL("../minecraft-mod/witch-hat-magic/src/main/", import.meta.url);

test("every registered mod item has a usable item model and referenced texture", async () => {
  const source = await readFile(new URL("java/io/github/nh1980mg/witchhat/magic/registry/MagicItems.java", moduleRoot), "utf8");
  const ids = new Set([
    ...source.matchAll(/method_60655\(WitchHatMagicMod\.MOD_ID,\s*"([a-z0-9_]+)"\)/g),
    ...source.matchAll(/ResourceLocation\.fromNamespaceAndPath\(WitchHatMagicMod\.MOD_ID,\s*"([a-z0-9_]+)"\)/g),
    ...source.matchAll(/registerBlockItem\("([a-z0-9_]+)"/g),
  ].map((match) => match[1]));

  assert.ok(ids.size >= 10, "the audit should discover the registered item catalogue");
  for (const id of ids) {
    const modelUrl = new URL(`resources/assets/witch_hat_magic/models/item/${id}.json`, moduleRoot);
    await assert.doesNotReject(access(modelUrl, constants.R_OK), `missing item model for ${id}`);
    const model = JSON.parse(await readFile(modelUrl, "utf8"));
    const layer = model?.textures?.layer0;
    if (typeof layer === "string" && layer.startsWith("witch_hat_magic:item/")) {
      const texture = layer.slice("witch_hat_magic:item/".length);
      const textureUrl = new URL(`resources/assets/witch_hat_magic/textures/item/${texture}.png`, moduleRoot);
      await assert.doesNotReject(access(textureUrl, constants.R_OK), `missing item texture for ${id}`);
    }
  }
});
