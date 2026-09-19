import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demoLevel,
  initialState,
  removeScrew,
  exposed,
  status,
  plateToWorld,
  worldToPlate,
  coversScrew,
  type State,
} from "../src/game.ts";
import { solve } from "./solve.ts";
const level = demoLevel();
test("covered, missing and already removed screws reject moves without mutation", () => {
  const state = initialState(level);
  assert.equal(removeScrew(level, state, 1), null);
  assert.equal(removeScrew(level, state, 999), null);
  const next = removeScrew(level, state, 0)!;
  assert.equal(removeScrew(level, next, 0), null);
  assert.deepEqual(state, initialState(level));
});
test("rotated and translated plate bounds use local coordinates", () => {
  const p = { id: 99, x: 3, y: -2, z: 4, width: 5.4, height: 0.88, angle: 90 };
  const point = plateToWorld(p, 2, 0);
  assert.ok(Math.abs(point.x - 3) < 1e-10);
  assert.ok(Math.abs(point.y) < 1e-10);
  const local = worldToPlate(p, point.x, point.y);
  assert.ok(Math.abs(local.x - 2) < 1e-10 && Math.abs(local.y) < 1e-10);
  assert.equal(
    coversScrew(p, { id: 99, plate: 0, color: "coral", ...point }),
    true,
  );
  assert.equal(
    coversScrew(p, { id: 99, plate: 0, color: "coral", x: 5, y: -2 }),
    false,
  );
});
test("clearing the top beam exposes the next central screw", () => {
  let state = initialState(level);
  assert.equal(exposed(level, state, level.screws[13]!), false);
  for (const id of [15, 16, 17]) state = removeScrew(level, state, id)!;
  assert.ok(state);
  assert.equal(exposed(level, state, level.screws[13]!), true);
});
test("pinwheel has a winning path and snapshots restore every move", () => {
  const path = solve(level);
  assert.equal(path?.length, 18);
  let state = initialState(level);
  const history: State[] = [];
  for (const id of path!) {
    history.push(state);
    state = removeScrew(level, state, id)!;
  }
  assert.equal(status(level, state), "won");
  while (history.length) state = history.pop()!;
  assert.deepEqual(state, initialState(level));
});
test("buffer drains into new trays before checking capacity", () => {
  const state: State = {
    removed: [],
    buffer: ["gold", "gold", "gold", "gold"],
    trays: [
      { color: "coral", count: 2 },
      { color: "teal", count: 0 },
    ],
    next: 2,
    moves: 0,
  };
  const next = removeScrew(level, state, 0)!;
  assert.deepEqual(next.buffer, ["gold"]);
  assert.equal(status(level, next), "playing");
});
test("full buffer prevents further moves, original snapshot remains playable", () => {
  const state: State = {
    removed: [],
    buffer: ["gold", "gold", "gold", "gold"],
    trays: [
      { color: "coral", count: 0 },
      { color: "teal", count: 0 },
    ],
    next: 2,
    moves: 0,
  };
  const next = removeScrew(level, state, 15)!;
  assert.equal(status(level, next), "stuck");
  assert.equal(removeScrew(level, next, 0), null);
  assert.equal(status(level, state), "playing");
});
