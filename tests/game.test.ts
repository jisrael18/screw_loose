import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demoLevel,
  initialState,
  removeScrew,
  exposed,
  status,
  type State,
} from "../src/game.ts";
const level = demoLevel();
test("covered, missing and already removed screws reject moves without mutation", () => {
  const state = initialState(level);
  assert.equal(removeScrew(level, state, 0), null);
  assert.equal(removeScrew(level, state, 999), null);
  const next = removeScrew(level, state, 12)!;
  assert.equal(removeScrew(level, next, 12), null);
  assert.deepEqual(state, initialState(level));
});
test("clearing a plate exposes the layer beneath; snapshots support undo", () => {
  let state = initialState(level);
  const before = structuredClone(state);
  for (const id of [12, 14, 13, 15, 16, 17])
    state = removeScrew(level, state, id)!;
  assert.ok(state);
  assert.equal(level.screws.filter((s) => exposed(level, state, s)).length, 6);
  assert.deepEqual(before, initialState(level));
});
test("the demo has a complete winning path", () => {
  const visited = new Set<string>();
  function solve(state: State): number[] | null {
    if (status(level, state) === "won") return [];
    if (status(level, state) === "stuck") return null;
    const key = JSON.stringify({
      ...state,
      removed: [...state.removed].sort(),
      moves: 0,
    });
    if (visited.has(key)) return null;
    visited.add(key);
    for (const s of level.screws) {
      const next = removeScrew(level, state, s.id);
      if (!next) continue;
      const path = solve(next);
      if (path) return [s.id, ...path];
    }
    return null;
  }
  const path = solve(initialState(level));
  assert.equal(path?.length, 18);
});
test("buffer drains into a newly opened tray before a full-buffer loss", () => {
  const state: State = {
    removed: [12],
    buffer: ["gold", "gold", "gold", "gold"],
    trays: [
      { color: "coral", count: 2 },
      { color: "teal", count: 0 },
    ],
    next: 2,
    moves: 1,
  };
  const next = removeScrew(level, state, 14)!;
  assert.deepEqual(next.buffer, ["gold"]);
  assert.equal(status(level, next), "playing");
});
test("full buffer is recoverable by restoring the previous snapshot", () => {
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
  const next = removeScrew(level, state, 17)!;
  assert.equal(status(level, next), "stuck");
  assert.equal(removeScrew(level, next, 12), null);
  assert.equal(status(level, state), "playing");
});
