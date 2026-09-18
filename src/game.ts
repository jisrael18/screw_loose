export type Color = "coral" | "teal" | "gold";
export interface Screw {
  id: number;
  plate: number;
  color: Color;
  x: number;
  y: number;
}
export interface Plate {
  id: number;
  z: number;
  width: number;
  height: number;
}
export interface Level {
  name: string;
  plates: Plate[];
  screws: Screw[];
  queue: Color[];
}
export interface State {
  removed: number[];
  buffer: Color[];
  trays: { color: Color; count: number }[];
  next: number;
  moves: number;
}
export const colors: Color[] = ["coral", "teal", "gold"];
export function demoLevel(): Level {
  const rows: Color[][] = [
    ["gold", "teal", "coral", "gold", "teal", "coral"],
    ["teal", "gold", "coral", "coral", "gold", "gold"],
    ["coral", "teal", "coral", "teal", "teal", "gold"],
  ];
  return {
    name: "The little workshop",
    plates: [0, 1, 2].map((id) => ({
      id,
      z: id * 0.35,
      width: 5.6 - id * 0.35,
      height: 3.9 - id * 0.3,
    })),
    screws: rows.flatMap((row, plate) =>
      row.map((color, i) => ({
        id: plate * 6 + i,
        plate,
        color,
        x: ((i % 3) - 1) * 1.65,
        y: i < 3 ? 1 : -1,
      })),
    ),
    queue: ["coral", "teal", "gold", "coral", "teal", "gold"],
  };
}
export function initialState(level: Level): State {
  return {
    removed: [],
    buffer: [],
    trays: level.queue.slice(0, 2).map((color) => ({ color, count: 0 })),
    next: 2,
    moves: 0,
  };
}
export function platePresent(level: Level, state: State, id: number): boolean {
  return level.screws.some(
    (s) => s.plate === id && !state.removed.includes(s.id),
  );
}
export function exposed(level: Level, state: State, screw: Screw): boolean {
  const plate = level.plates.find((p) => p.id === screw.plate)!;
  return (
    !state.removed.includes(screw.id) &&
    !level.plates.some(
      (p) =>
        p.z > plate.z &&
        platePresent(level, state, p.id) &&
        Math.abs(screw.x) < p.width / 2 + 0.25 &&
        Math.abs(screw.y) < p.height / 2 + 0.25,
    )
  );
}
export function status(
  level: Level,
  state: State,
): "playing" | "won" | "stuck" {
  if (
    state.removed.length === level.screws.length &&
    state.buffer.length === 0 &&
    state.trays.length === 0
  )
    return "won";
  return state.buffer.length >= 5 ? "stuck" : "playing";
}
export function removeScrew(
  level: Level,
  state: State,
  id: number,
): State | null {
  const screw = level.screws.find((s) => s.id === id);
  if (
    !screw ||
    status(level, state) !== "playing" ||
    !exposed(level, state, screw)
  )
    return null;
  const next = structuredClone(state);
  next.removed.push(id);
  next.moves++;
  next.buffer.push(screw.color);
  // Filling a tray may expose a new color that can consume already parked screws.
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < next.trays.length; i++) {
      const tray = next.trays[i];
      const index = next.buffer.indexOf(tray.color);
      if (index === -1) continue;
      next.buffer.splice(index, 1);
      tray.count++;
      changed = true;
      if (tray.count === 3) {
        if (next.next < level.queue.length)
          next.trays[i] = { color: level.queue[next.next++]!, count: 0 };
        else {
          next.trays.splice(i, 1);
          i--;
        }
      }
    }
  }
  return next;
}
