import * as pc from "playcanvas";
import {
  exposed,
  platePresent,
  worldToPlate,
  type Level,
  type State,
} from "./game.ts";
import { plateMesh } from "./geometry.ts";
export const palette = { coral: "#ef887a", teal: "#70c9bd", gold: "#efbd58" };
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export function createScene(
  canvas: HTMLCanvasElement,
  level: Level,
  select: (id: number) => void,
  onBusy: (busy: boolean) => void,
) {
  const app = new pc.Application(canvas, {});
  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio, 2);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.scene.ambientLight = new pc.Color(0.37, 0.41, 0.46);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const camera = new pc.Entity("Camera");
  camera.addComponent("camera", {
    fov: 37,
    nearClip: 0.1,
    farClip: 100,
    clearColor: new pc.Color(0.075, 0.115, 0.14),
  });
  app.root.addChild(camera);
  let yaw = 0.3,
    pitch = 0.32;
  const target = new pc.Vec3(0, 0, 0.7);
  function positionCamera() {
    const rect = canvas.getBoundingClientRect();
    const distance = 14 * Math.max(1, rect.height / rect.width);
    camera.setPosition(
      distance * Math.sin(yaw) * Math.cos(pitch),
      distance * Math.sin(pitch),
      target.z + distance * Math.cos(yaw) * Math.cos(pitch),
    );
    camera.lookAt(target);
    app.renderNextFrame = true;
  }
  const light = new pc.Entity("Large softbox");
  light.addComponent("light", {
    type: "directional",
    color: new pc.Color(1, 0.91, 0.77),
    intensity: 1.35,
    castShadows: true,
    shadowResolution: 1024,
    shadowDistance: 25,
    shadowBias: 0.15,
    normalOffsetBias: 0.025,
    shadowType: pc.SHADOW_PCF3,
  });
  light.setEulerAngles(45, -25, -25);
  app.root.addChild(light);
  const fill = new pc.Entity("Cool fill");
  fill.addComponent("light", {
    type: "directional",
    color: new pc.Color(0.66, 0.82, 1),
    intensity: 0.6,
  });
  fill.setEulerAngles(120, 30, 100);
  app.root.addChild(fill);
  const materials = new Map<string, pc.StandardMaterial>();
  function material(hex: string, shiny = false) {
    const key = hex + shiny;
    if (!materials.has(key)) {
      const m = new pc.StandardMaterial();
      m.diffuse = new pc.Color().fromString(hex);
      m.specular = new pc.Color(
        shiny ? 0.65 : 0.2,
        shiny ? 0.65 : 0.2,
        shiny ? 0.65 : 0.2,
      );
      m.shininess = shiny ? 65 : 28;
      m.update();
      materials.set(key, m);
    }
    return materials.get(key)!;
  }
  function primitive(
    parent: pc.Entity,
    name: string,
    type: "box" | "cylinder" | "sphere",
    hex: string,
    pos: number[],
    scale: number[],
    shiny = false,
  ) {
    const e = new pc.Entity(name);
    e.addComponent("render", {
      type,
      material: material(hex, shiny),
      castShadows: true,
      receiveShadows: true,
    });
    e.setLocalPosition(pos[0]!, pos[1]!, pos[2]!);
    e.setLocalScale(scale[0]!, scale[1]!, scale[2]!);
    parent.addChild(e);
    return e;
  }
  function cylinder(
    parent: pc.Entity,
    name: string,
    hex: string,
    x: number,
    y: number,
    z: number,
    diameter: number,
    depth: number,
    shiny = false,
  ) {
    const e = primitive(
      parent,
      name,
      "cylinder",
      hex,
      [x, y, z],
      [diameter, depth, diameter],
      shiny,
    );
    e.setLocalEulerAngles(90, 0, 0);
    return e;
  }
  primitive(
    app.root,
    "Backdrop",
    "box",
    "#203039",
    [0, 0, -1.05],
    [200, 200, 0.2],
  );
  cylinder(app.root, "Turntable", "#34454b", 0, 0, -0.65, 7.1, 0.42);
  cylinder(app.root, "Turntable rim", "#b09462", 0, 0, -0.4, 6.85, 0.09, true);
  cylinder(app.root, "Turntable face", "#263940", 0, 0, -0.33, 6.65, 0.1);
  for (let i = 0; i < 48; i++) {
    const a = (i * Math.PI) / 24;
    const mark = primitive(
      app.root,
      "Dial tick",
      "box",
      "#718180",
      [3.16 * Math.cos(a), 3.16 * Math.sin(a), -0.27],
      [i % 4 === 0 ? 0.12 : 0.06, 0.022, 0.01],
    );
    mark.setLocalEulerAngles(0, 0, i * 7.5);
  }
  const plateColors = [
    "#688c9b",
    "#c3a46e",
    "#849f9d",
    "#cf9b74",
    "#7d9daa",
    "#d3b778",
  ];
  const meshes: pc.Mesh[] = [];
  const plates = new Map(
    level.plates.map((p) => {
      const root = new pc.Entity(`Plate ${p.id}`);
      app.root.addChild(root);
      root.setPosition(p.x, p.y, p.z);
      root.setEulerAngles(0, 0, p.angle);
      const mesh = plateMesh(app.graphicsDevice, p.width, p.height);
      meshes.push(mesh);
      root.addComponent("render", {
        meshInstances: [
          new pc.MeshInstance(mesh, material(plateColors[p.id % 6]!, true)),
        ],
        castShadows: true,
        receiveShadows: true,
      });
      // Recessed mounting seats stay behind after screws lift away.
      for (const screw of level.screws.filter((s) => s.plate === p.id)) {
        const pos = worldToPlate(p, screw.x, screw.y);
        cylinder(
          root,
          "Mounting seat",
          "#313e40",
          pos.x,
          pos.y,
          0.145,
          0.4,
          0.014,
        );
        cylinder(root, "Bore", "#131f24", pos.x, pos.y, 0.157, 0.19, 0.014);
      }
      if (p.id > 0)
        cylinder(
          root,
          "Layer spacer",
          "#8e7956",
          0,
          0,
          -0.25,
          0.55,
          0.25,
          true,
        );
      return [p.id, root] as const;
    }),
  );
  const screws = level.screws.map((s) => {
    const p = level.plates.find((p) => p.id === s.plate)!;
    const origin = new pc.Vec3(s.x, s.y, p.z + 0.2);
    const root = new pc.Entity(`Screw ${s.id}`);
    app.root.addChild(root);
    root.setPosition(origin);
    cylinder(root, "Thread shaft", "#a2b3b8", 0, 0, -0.25, 0.17, 0.55, true);
    for (let i = 0; i < 8; i++)
      cylinder(
        root,
        "Thread ridge",
        "#d0d9d7",
        0,
        0,
        -0.49 + i * 0.056,
        0.235,
        0.028,
        true,
      );
    cylinder(root, "Steel washer", "#c0c9c4", 0, 0, -0.025, 0.61, 0.075, true);
    cylinder(
      root,
      "Colored head",
      palette[s.color],
      0,
      0,
      0.06,
      0.53,
      0.17,
      true,
    );
    cylinder(
      root,
      "Head bevel",
      palette[s.color],
      0,
      0,
      0.15,
      0.46,
      0.045,
      true,
    );
    // Every fastener uses the same Phillips cross recess. Color identifies the
    // tray; the head geometry stays consistent across the whole level.
    primitive(
      root,
      "Phillips recess horizontal",
      "box",
      "#324147",
      [0, 0, 0.177],
      [0.32, 0.065, 0.009],
    );
    primitive(
      root,
      "Phillips recess vertical",
      "box",
      "#324147",
      [0, 0, 0.18],
      [0.065, 0.32, 0.009],
    );
    return { screw: s, root, origin };
  });
  let current: State | undefined;
  let transition:
    | { id: number; started: number; falling: number[]; destination: pc.Vec3 }
    | undefined;
  function setBusy(busy: boolean) {
    canvas.dataset.busy = String(busy);
    onBusy(busy);
  }
  function restore() {
    if (!current) return;
    for (const p of level.plates) {
      const entity = plates.get(p.id)!;
      entity.enabled = platePresent(level, current, p.id);
      entity.setPosition(p.x, p.y, p.z);
      entity.setEulerAngles(0, 0, p.angle);
      entity.setLocalScale(1, 1, 1);
    }
    for (const { screw, root, origin } of screws) {
      root.enabled = !current.removed.includes(screw.id);
      root.setPosition(origin);
      root.setEulerAngles(0, 0, 0);
      root.setLocalScale(1, 1, 1);
    }
  }
  function finish() {
    transition = undefined;
    restore();
    setBusy(false);
    app.renderNextFrame = true;
  }
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    app.graphicsDevice.resizeCanvas(r.width, r.height);
    positionCamera();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  // Ray picking stays correct after orbiting: nearer solid plates occlude heads.
  function pick(clientX: number, clientY: number) {
    if (!current || transition) return;
    const rect = canvas.getBoundingClientRect();
    const near = camera.camera!.screenToWorld(
      clientX - rect.left,
      clientY - rect.top,
      0.1,
    );
    const far = camera.camera!.screenToWorld(
      clientX - rect.left,
      clientY - rect.top,
      100,
    );
    const dir = far.clone().sub(near).normalize();
    const hits = screws
      .filter((s) => !current!.removed.includes(s.screw.id))
      .map((s) => {
        const center = s.origin.clone().add(new pc.Vec3(0, 0, 0.1));
        const offset = near.clone().sub(center),
          b = offset.dot(dir),
          c = offset.dot(offset) - 0.31 ** 2;
        const discriminant = b * b - c;
        return {
          s,
          t: discriminant >= 0 ? -b - Math.sqrt(discriminant) : Infinity,
        };
      })
      .filter((h) => h.t > 0 && Number.isFinite(h.t))
      .sort((a, b) => a.t - b.t);
    const hit = hits[0];
    if (!hit || !exposed(level, current, hit.s.screw)) return;
    for (const p of level.plates) {
      if (p.id === hit.s.screw.plate || !platePresent(level, current, p.id))
        continue;
      const t = (p.z + 0.14 - near.z) / dir.z;
      if (t <= 0 || t >= hit.t) continue;
      const local = worldToPlate(p, near.x + dir.x * t, near.y + dir.y * t);
      if (Math.abs(local.x) < p.width / 2 && Math.abs(local.y) < p.height / 2)
        return;
    }
    return hit.s.screw;
  }
  let pointer:
    | {
        id: number;
        x: number;
        y: number;
        lastX: number;
        lastY: number;
        dragged: boolean;
      }
    | undefined;
  const down = (e: PointerEvent) => {
    if (transition || pointer || e.button !== 0) return;
    pointer = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      dragged: false,
    };
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (pointer && pointer.id === e.pointerId) {
      if (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 6)
        pointer.dragged = true;
      if (pointer.dragged) {
        yaw = clamp(yaw - (e.clientX - pointer.lastX) * 0.006, -0.65, 0.65);
        pitch = clamp(pitch + (e.clientY - pointer.lastY) * 0.006, -0.45, 0.65);
        positionCamera();
      }
      pointer.lastX = e.clientX;
      pointer.lastY = e.clientY;
    }
    canvas.style.cursor = pointer?.dragged
      ? "grabbing"
      : pick(e.clientX, e.clientY)
        ? "pointer"
        : "grab";
  };
  const up = (e: PointerEvent) => {
    if (!pointer || pointer.id !== e.pointerId) return;
    const click = !pointer.dragged;
    pointer = undefined;
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
    if (click) {
      const screw = pick(e.clientX, e.clientY);
      if (screw) select(screw.id);
    }
  };
  const cancel = () => {
    pointer = undefined;
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("lostpointercapture", cancel);
  const motionChange = () => {
    if (reducedMotion.matches && transition) finish();
  };
  reducedMotion.addEventListener("change", motionChange);
  app.on("update", () => {
    if (!transition) return;
    app.renderNextFrame = true;
    const { id, started, falling, destination } = transition;
    const time = (performance.now() - started) / 1000;
    const { root, origin } = screws.find((s) => s.screw.id === id)!;
    const lift = clamp(time / 0.52, 0, 1),
      fly = clamp((time - 0.52) / 0.45, 0, 1);
    const start = origin.clone().add(new pc.Vec3(0, 0, 1.1));
    root.setPosition(
      fly > 0
        ? new pc.Vec3().lerp(start, destination, ease(fly))
        : origin.clone().add(new pc.Vec3(0, 0, lift * 1.1)),
    );
    root.setEulerAngles(fly * 45, fly * 25, -lift * 1080);
    const scale = 1 - fly * 0.85;
    root.setLocalScale(scale, scale, scale);
    root.enabled = fly < 1;
    const drop = clamp((time - 0.55) / 0.85, 0, 1);
    for (const id of falling) {
      const p = level.plates.find((p) => p.id === id)!,
        entity = plates.get(id)!;
      entity.setPosition(
        p.x + drop * 0.7,
        p.y - drop * drop * 8,
        p.z + Math.sin(drop * Math.PI) * 0.6,
      );
      entity.setEulerAngles(drop * 80, drop * 25, p.angle + drop * 35);
      entity.enabled = drop < 1;
    }
    if (time >= (falling.length ? 1.4 : 0.97)) finish();
  });
  app.autoRender = false;
  app.start();
  resize();
  return {
    sync(state: State, removedId?: number) {
      const before = current;
      transition = undefined;
      current = state;
      restore();
      app.renderNextFrame = true;
      if (removedId !== undefined && before && !reducedMotion.matches) {
        const entry = screws.find((s) => s.screw.id === removedId)!;
        const falling = level.plates
          .filter(
            (p) =>
              platePresent(level, before, p.id) &&
              !platePresent(level, state, p.id),
          )
          .map((p) => p.id);
        for (const id of falling) plates.get(id)!.enabled = true;
        entry.root.enabled = true;
        const rect = canvas.getBoundingClientRect();
        const trayIndex = before.trays.findIndex(
          (t) => t.color === entry.screw.color,
        );
        const tray =
          trayIndex >= 0
            ? document.querySelectorAll("#trays .tray")[trayIndex]
            : document.getElementById("buffer");
        const box = tray?.getBoundingClientRect();
        const x = box
          ? clamp(box.x + box.width / 2 - rect.x, 16, rect.width - 16)
          : rect.width / 2;
        const y = trayIndex >= 0 ? 16 : rect.height - 16;
        const destination = camera.camera!.screenToWorld(
          x,
          y,
          camera.getPosition().distance(target) - 1.5,
        );
        transition = {
          id: removedId,
          started: performance.now(),
          falling,
          destination,
        };
        setBusy(true);
      } else setBusy(false);
    },
    resetView() {
      yaw = 0.3;
      pitch = 0.32;
      positionCamera();
    },
    isBusy: () => !!transition,
    destroy() {
      observer.disconnect();
      reducedMotion.removeEventListener("change", motionChange);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", cancel);
      app.destroy();
      for (const mesh of meshes) mesh.destroy();
      for (const m of materials.values()) m.destroy();
    },
  };
}
