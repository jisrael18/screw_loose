import * as pc from "playcanvas";
import { exposed, platePresent, type Level, type State } from "./game.ts";
export const palette = { coral: "#eb796c", teal: "#68c5ba", gold: "#e9b957" };
export function createScene(
  canvas: HTMLCanvasElement,
  level: Level,
  select: (id: number) => void,
) {
  const app = new pc.Application(canvas, {});
  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio, 2);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.scene.ambientLight = new pc.Color(0.65, 0.65, 0.65);
  const camera = new pc.Entity("Camera");
  camera.addComponent("camera", {
    projection: pc.PROJECTION_ORTHOGRAPHIC,
    orthoHeight: 3.5,
    clearColor: new pc.Color(0.09, 0.14, 0.17),
  });
  camera.setPosition(0, 0, 12);
  app.root.addChild(camera);
  const light = new pc.Entity("Soft light");
  light.addComponent("light", { type: "directional", intensity: 0.8 });
  light.setEulerAngles(25, -25, 0);
  app.root.addChild(light);
  const materials = new Map<string, pc.StandardMaterial>();
  function material(hex: string) {
    if (!materials.has(hex)) {
      const m = new pc.StandardMaterial();
      m.diffuse = new pc.Color().fromString(hex);
      m.shininess = 45;
      m.update();
      materials.set(hex, m);
    }
    return materials.get(hex)!;
  }
  function mesh(
    name: string,
    type: "box" | "cylinder",
    hex: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    const e = new pc.Entity(name);
    e.addComponent("render", { type, material: material(hex) });
    e.setPosition(x, y, z);
    e.setLocalScale(w, h, d);
    app.root.addChild(e);
    return e;
  }
  const plates = new Map(
    level.plates.map((p) => [
      p.id,
      mesh(
        `Plate ${p.id}`,
        "box",
        ["#687e8c", "#aab6ae", "#d3c5a7"][p.id % 3]!,
        0,
        0,
        p.z,
        p.width,
        p.height,
        0.18,
      ),
    ]),
  );
  const screws = level.screws.map((s) => {
    const z = level.plates.find((p) => p.id === s.plate)!.z + 0.18;
    const head = mesh(
      `Screw ${s.id}`,
      "cylinder",
      palette[s.color],
      s.x,
      s.y,
      z,
      0.58,
      0.2,
      0.58,
    );
    head.setEulerAngles(90, 0, 0);
    const slot = mesh(
      "Slot",
      "box",
      "#25353c",
      s.x,
      s.y,
      z + 0.105,
      0.31,
      0.07,
      0.015,
    );
    return { screw: s, head, slot };
  });
  let current: State;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    app.graphicsDevice.resizeCanvas(r.width, r.height);
    camera.camera!.orthoHeight = Math.max(2.8, (3.5 * r.height) / r.width);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  canvas.addEventListener("pointerup", (event) => {
    if (!current) return;
    const rect = canvas.getBoundingClientRect();
    const world = camera.camera!.screenToWorld(
      event.clientX - rect.left,
      event.clientY - rect.top,
      12,
    );
    const hit = level.screws.find(
      (s) =>
        exposed(level, current, s) &&
        Math.hypot(world.x - s.x, world.y - s.y) < 0.4,
    );
    if (hit) select(hit.id);
  });
  app.start();
  resize();
  return {
    sync(state: State) {
      current = state;
      for (const p of level.plates)
        plates.get(p.id)!.enabled = platePresent(level, state, p.id);
      for (const { screw, head, slot } of screws)
        head.enabled = slot.enabled = !state.removed.includes(screw.id);
    },
    destroy() {
      observer.disconnect();
      app.destroy();
    },
  };
}
