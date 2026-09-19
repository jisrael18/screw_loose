import "./style.css";
import {
  colors,
  demoLevel,
  exposed,
  initialState,
  removeScrew,
  status,
  type State,
} from "./game.ts";
import { createScene, palette } from "./scene.ts";
const level = demoLevel();
let state = initialState(level);
const history: State[] = [];
const get = (id: string) => document.getElementById(id)!;
let scene: ReturnType<typeof createScene> | undefined;
let busy = false;
function updateInput() {
  for (const button of get("accessible").querySelectorAll("button"))
    button.disabled = busy || status(level, state) !== "playing";
}
function choose(id: number) {
  if (busy) return;
  const next = removeScrew(level, state, id);
  if (!next) return;
  history.push(state);
  state = next;
  render(id);
}
function dot(color?: (typeof colors)[number]) {
  return `<span class="dot ${color ?? "empty"}" ${color ? `style="--color:${palette[color]}"` : ""} aria-label="${color ? `${color} Phillips screw` : "empty slot"}></span>`;
}
function render(removedId?: number) {
  scene?.sync(state, removedId);
  get("trays").innerHTML =
    state.trays
      .map(
        (t) =>
          `<div class="tray"><span class="tray-name">${t.color}</span><div>${Array.from({ length: 3 }, (_, i) => dot(i < t.count ? t.color : undefined)).join("")}</div><small>${t.count} / 3</small></div>`,
      )
      .join("") || '<div class="tray complete">All packed. Nicely done!</div>';
  get("buffer").innerHTML = Array.from({ length: 5 }, (_, i) =>
    dot(state.buffer[i]),
  ).join("");
  get("progress").textContent =
    `${state.removed.length} / ${level.screws.length} screws`;
  const result = status(level, state);
  document.querySelector(".board")!.classList.toggle("won", result === "won");
  get("status").textContent =
    result === "won"
      ? "Everything’s loose! You cleared the workshop."
      : result === "stuck"
        ? "Spare slots are full. Undo a move or restart — both are always free."
        : "Drag to look around. Tap an uncovered screw to loosen it.";
  (get("undo") as HTMLButtonElement).disabled = !history.length;
  const options = get("accessible");
  options.replaceChildren();
  for (const s of level.screws.filter((s) => exposed(level, state, s))) {
    const button = document.createElement("button");
    button.textContent = `${s.color} screw ${s.id + 1}`;
    button.disabled = busy || result !== "playing";
    button.onclick = () => choose(s.id);
    options.append(button);
  }
}
get("undo").onclick = () => {
  const previous = history.pop();
  if (previous) {
    state = previous;
    render();
  }
};
get("restart").onclick = () => {
  history.length = 0;
  state = initialState(level);
  render();
};
get("reset-view").onclick = () => scene?.resetView();
get("level-name").textContent = level.name;
try {
  scene = createScene(
    get("board") as HTMLCanvasElement,
    level,
    choose,
    (value) => {
      busy = value;
      updateInput();
      get("trays").classList.toggle("settled", !value);
    },
  );
} catch (error) {
  console.error(error);
  const warning = document.createElement("p");
  warning.textContent =
    "3D graphics could not start. You can still play using the screw buttons below.";
  get("board").replaceWith(warning);
  document.querySelector("details")!.open = true;
}
render();

if (import.meta.hot) import.meta.hot.dispose(() => scene?.destroy());
