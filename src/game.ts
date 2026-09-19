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
  x: number;
  y: number;
  angle: number;
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
  const plates: Plate[] = Array.from({ length: 6 }, (_, id) => ({
    id,
    x: 0,
    y: 0,
    z: id * 0.42,
    angle: id * 30,
    width: 5.4,
    height: 0.88,
  }));
  return {
    name: "The brass pinwheel",
    plates,
    screws: plates.flatMap((p) =>
      [-2.16, 0, 2.16].map((x, i) => ({
        id: p.id * 3 + i,
        plate: p.id,
        color: colors[(i + p.id) % colors.length]!,
        ...plateToWorld(p, x, 0),
      })),
    ),
    queue: ["coral", "teal", "gold", "coral", "teal", "gold"],
  };
}
/** Plate-local coordinates are shared by rendering and exposure tests. */
export function plateToWorld(p: Plate, x: number, y: number) {
  const a = (p.angle * Math.PI) / 180;
  return {
    x: p.x + x * Math.cos(a) - y * Math.sin(a),
    y: p.y + x * Math.sin(a) + y * Math.cos(a),
  };
}
export function worldToPlate(p: Plate, x: number, y: number) {
  const a = (-p.angle * Math.PI) / 180;
  return {
    x: (x - p.x) * Math.cos(a) - (y - p.y) * Math.sin(a),
    y: (x - p.x) * Math.sin(a) + (y - p.y) * Math.cos(a),
  };
}
/** Conservative clearance around the head, independent of viewing angle. */
export function coversScrew(p: Plate, screw: Screw): boolean {
  const local = worldToPlate(p, screw.x, screw.y);
  return (
    Math.abs(local.x) < p.width / 2 + 0.28 &&
    Math.abs(local.y) < p.height / 2 + 0.28
  );
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
        coversScrew(p, screw),
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
