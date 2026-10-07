import assert from "node:assert/strict";
import test from "node:test";

import { createDrawingSession } from "../game-drawing-overlay.mjs";

test("cancelled drawing keeps the previous valid spell", () => {
  const previous = { id: "old", name: "Ancien sort", actions: [{ type: "glyph", element: "Eau" }] };
  const session = createDrawingSession({ previousSpell: previous });

  session.beginDrawing();
  session.appendDrawingStroke([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
  const result = session.cancelDrawing("interrupted");

  assert.equal(result.accepted, false);
  assert.deepEqual(result.spell, previous);
});

test("completed drawing returns bounded serializable points", () => {
  const session = createDrawingSession({ maxPoints: 4 });

  session.beginDrawing();
  session.appendDrawingStroke([
    { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 },
  ]);
  const result = session.completeDrawing();

  assert.equal(result.accepted, true);
  assert.equal(result.points.length, 4);
  assert.deepEqual(result.points.at(-1), { x: 1, y: 1 });
});

test("a pointer stroke can collect many points without consuming the stroke limit", () => {
  const session = createDrawingSession({ maxStrokes: 2, maxPoints: 32 });

  session.beginDrawing();
  session.beginStroke({ x: 0, y: 0 });
  for (let index = 1; index < 20; index += 1) {
    session.appendStrokePoint({ x: index / 20, y: index / 20 });
  }
  const result = session.endStroke();

  assert.equal(result.accepted, true);
  assert.equal(result.points.length, 20);
  assert.equal(session.getSnapshot().strokeCount, 1);
});

test("non-finite points are ignored and the session can be disposed", () => {
  const session = createDrawingSession({ maxPoints: 8 });

  session.beginDrawing();
  session.appendDrawingStroke([{ x: Number.NaN, y: 0 }, { x: 0.5, y: 0.25 }]);
  assert.equal(session.completeDrawing().points.length, 1);

  session.dispose();
  assert.equal(session.beginDrawing().accepted, false);
});
