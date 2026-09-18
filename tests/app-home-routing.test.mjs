import test from "node:test";
import assert from "node:assert/strict";
import { isWorkshopLocation, savedSpellHref } from "../app-home-routing.mjs";

test("ordinary visits open the home gallery", () => {
  for (const location of [{}, { hash: "#home" }, { search: "?release=latest" }]) {
    assert.equal(isWorkshopLocation(location), false);
  }
});

test("new canvases, saved canvases and existing spell links open the editor", () => {
  for (const location of [
    {search:"?view=atelier"}, {search:"?spell=saved-1"},
    {search:"?sigils=Eau&signs=Orbe"}, {search:"?communityCircle=encoded"},
    {hash:"#practice"},
  ]) assert.equal(isWorkshopLocation(location), true);
});

test("saved canvas links preserve the entire ID without injecting parameters", () => {
  const id = "canvas / with &signs=Feu#name";
  const url = new URL(savedSpellHref(id), "https://example.com/simulator/");
  assert.equal(url.searchParams.get("spell"), id);
  assert.equal(url.searchParams.get("view"), "atelier");
  assert.equal(url.searchParams.has("signs"), false);
});
