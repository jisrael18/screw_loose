# Screw Loose

An ad-free, browser-first screw-sorting puzzle inspired by the genre of Screwdom. Original procedural visuals, with no copied assets, ads, accounts, timers, paid boosts, or energy system.

## Run the demo

Requires Node.js 24+ and npm.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. No PlayCanvas Editor account is required.

## Play

Tap an exposed colored screw. It goes into a matching tray, or into one of five spare slots. Three matching screws complete a tray and bring in the next tray; parked screws automatically transfer when their color becomes available. Empty plates disappear to expose the layer below. Clear all 18 screws to win. Filling all five spare slots ends the attempt. Undo and restart are unlimited and free.

The expandable keyboard controls offer labeled buttons for every exposed screw. The initial demo has one hand-authored, solver-tested level and a fixed front-facing camera. Plate removal is instantaneous; physical falling, unscrewing animation, sound, progression, and saving are follow-up work.

## Development

```sh
npm test                 # engine-independent rules and solvability tests
npm run build           # strict TypeScript checking and production bundle
npx playwright install chromium
npm run test:browser    # desktop/mobile-sized browser smoke tests
npm run preview         # serve the production build locally
```

`dist/` is a static site and can be hosted by any static host. No hosting deployment is included in this scaffold. Vite's default root base assumes hosting at `/`; run `npx vite build --base=/screw_loose/` after type checking for GitHub Pages subpath hosting.

## Structure

- `src/game.ts`: level data, pure state transitions, exposure rules, tray routing, win/loss detection. No PlayCanvas or DOM dependency.
- `src/scene.ts`: PlayCanvas scene, procedural meshes, responsive orthographic camera and pointer picking.
- `src/main.ts`: UI/state coordination and undo snapshots.
- `src/style.css`: responsive workshop UI.
- `tests/`: rules/solvability tests and Playwright browser smoke tests.
- `.github/workflows/ci.yml`: tests, type checking, production build and Chromium smoke tests.

Keep level definitions and rules independent of presentation. Future physical animation should visualize committed moves without changing deterministic puzzle outcomes. Do not add advertising, paid retries, or artificial wait timers.

## Roadmap

See GitHub issues for level validation and authoring, an expanded campaign, animation, accessibility and mobile polish, local saves, audio, and release hosting/offline support.

Engine setup reference: https://developer.playcanvas.com/user-manual/engine/standalone/
