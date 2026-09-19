import {
  removeScrew,
  initialState,
  status,
  type Level,
  type State,
} from "../src/game.ts";
/** Bounded test solver: keep hand-authored demo changes demonstrably playable. */
export function solve(level: Level): number[] | null {
  const visited = new Set<string>();
  function visit(state: State): number[] | null {
    if (status(level, state) === "won") return [];
    if (status(level, state) === "stuck") return null;
    const key = JSON.stringify({
      ...state,
      removed: [...state.removed].sort((a, b) => a - b),
      moves: 0,
    });
    if (visited.has(key)) return null;
    if (visited.size > 100000) throw new Error("Solver search budget exceeded");
    visited.add(key);
    for (const screw of level.screws) {
      const next = removeScrew(level, state, screw.id);
      if (!next) continue;
      const path = visit(next);
      if (path) return [screw.id, ...path];
    }
    return null;
  }
  return visit(initialState(level));
}
