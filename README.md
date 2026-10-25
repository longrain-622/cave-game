# CaveGame

A 2D pixel-style fan game of Minecraft, developed by [Sinuxu Studio](https://gitee.com/longrain622/cave-game).

This game is open source and free of charge. It involves no monetization and no virtual currency system, and is dedicated to providing players with a pure, free experience of creation and exploration.

> Current version: `1.1.0-alpha.1`

## Features

- **World generation**: chunk-based infinite terrain, 256-block height, day-night cycle
- **Block system**: place/break with block hardness and break animations; block mechanics including grass spread, sand gravity, cactus, dead bush, doors, and snow grass
- **Items & crafting**: wooden/stone/iron tool tiers (sword, axe, shovel, pickaxe), crafting table recipes, furnace, chest
- **Animals**: pigs, cows, chickens, sheep
- **Player**: health, movement, block interaction, death screen
- **Saving**: localforage-based local saves — create, load, and delete worlds
- **Audio**: background music and sound effects
- **Settings**: touch controls, screen-rotation lock, language switching (Simplified Chinese / English)
- **Mobile support**: on-screen virtual touch buttons

## Tech Stack

| Category | Choice |
|---|---|
| Rendering | [PixiJS](https://pixijs.com/) 7 |
| Storage | [localforage](https://localforage.github.io/localForage/) |
| Language | TypeScript |
| Build | [Vite](https://vitejs.dev/) |
| Desktop | [Electron](https://www.electronjs.org/) + [electron-builder](https://www.electron.build/) |
| Testing | [Vitest](https://vitest.dev/) |

## Getting Started

Requirements: Node.js 22.12+ and npm.

```bash
npm install        # Install dependencies
npm run dev        # Development mode with HMR (http://localhost:3000)
npm run build      # Build dist with Vite
npm run preview    # Preview the build locally (http://localhost:4173)
npm test           # Run unit tests (vitest)
npm run typecheck  # Type-check src + test (recommended before committing)
```

> **Note**: The root `index.html` is the Vite build entry (it references `/src/*.ts`). It cannot be opened directly with a static file server or by double-clicking it (`file://`) — use `npm run dev` for development, and deploy or preview the `dist/` output from `npm run build`. Browsers run only the built `dist/` output.

## Desktop App (Electron)

```bash
npm run electron:dev    # Start Vite dev server and open an Electron window
npm run electron:start  # Build dist, then run it in an Electron window
npm run electron:dir    # Build an unpacked desktop app (release/win-unpacked)
npm run electron:build  # Build the Windows installer (release/)
```

The desktop build loads `dist/` through a privileged `app://cavegame/` protocol instead of `file://`, so ES modules, `fetch`, IndexedDB saves, and audio keep working with a stable origin. Saves live in Electron's per-user data directory (`%APPDATA%/CaveGame` on Windows) and are separate from browser saves. The Windows installer is a per-user install with no administrator prompt. `F11` toggles fullscreen; `F12` opens DevTools in development runs.

The first install may need to download the Electron runtime. If GitHub is unreachable, use a mirror for both install and packaging:

```bash
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
export ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
npm install
npm run electron:build
```

On Windows, set the same two variables with `set` (cmd) or `$env:NAME = "..."` (PowerShell) before running the commands.

## Project Structure

```
├── src/         TypeScript source code (the single source of truth)
│   ├── apiox/        Web API wrapper layer (browser APIs must go through this layer; direct use is prohibited)
│   ├── constants/    Constants and shared leaf modules (incl. settingConfig, i18nLang)
│   ├── contentRoom/  Menu, world management, settings UI logic
│   ├── css/          Global styles (imported by src/main.ts, bundled by Vite)
│   ├── gameRoom/     The game itself (world, player, rendering, GUI, block mechanics, animals, etc.)
│   ├── others/       General modules such as i18n
│   ├── types/        Type definitions
│   └── user/         Save/load
├── public/assets/  Game assets (images, sounds, locale files, fonts) — Vite publicDir,
│                    copied verbatim to dist/assets/ and served at /assets/...
├── electron/     Electron main process (`main.cjs`) and packaging resources
├── scripts/      Development helpers (Electron + Vite launcher)
├── test/         Vitest unit tests
├── release/      electron-builder output (gitignored)
└── dist/         Vite build output (gitignored)
```

## Architecture Notes (Important)

Standard Vite single-source build:

- **One source tree, one bundler**: `src/` is the only source tree; Vite compiles and bundles it directly (no intermediate `js/` output, no manual compile step). `index.html` at the repo root loads `/src/*.ts` module entries.
- **The game chain is lazy-loaded**: the 15 game modules are dynamically imported by `LoadScripts` (and the game entry by `main`/`content`) via **relative dynamic imports**, so Vite code-splits them into async chunks that load only when the player enters the game room — preserving the original on-demand behavior.
- **Assets as `publicDir`**: `public/assets/` is Vite's `publicDir`, copied verbatim into `dist/assets/` and served at `/assets/...`. Runtime string paths (`PIXI.Assets`, `fetch`, `Audio`) are page-relative (`assets/...`) so they resolve identically in dev and after deploy.
- **Dependencies bundled normally**: `pixi.js` and `localforage` are resolved from `node_modules` by Vite (no importmap, no `dist/node_modules` mirroring, no `external`).
- **Desktop shell**: `electron/main.cjs` runs the renderer with Node integration disabled and context isolation enabled. In production it serves the built files from `dist/` (including inside `app.asar`) via the privileged `app://cavegame/` scheme, so the game sees one stable origin in every desktop run.

> Dev workflow: `npm run dev` — HMR works directly on `src/`, no manual compilation step. Build: `npm run build` → `dist/`, verify with `npm run preview`.

## Testing

- `npm test` — run Vitest unit tests (block mechanics, crafting recipe data integrity)
- `npm run typecheck` — run `tsc --noEmit` over `src/` and `test/`; recommended before committing

## License

This project is dual-licensed.

- **Code** (all source files, e.g., `src/`, `*.js`, `*.ts`):
  [MIT License](./LICENSE-CODE.txt)

- **Assets** (all images, audio files, 3D models, fonts, etc., e.g., `assets/`):
  [CC BY-NC-ND 4.0](./LICENSE-ASSETS.txt) (Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International)

### Attribution for assets

If you share any asset from this project, you must give appropriate credit.
Suggested format:
`"[Asset Name]" by LongRain, licensed under CC BY-NC-ND 4.0`

See the license files for full terms and conditions.

Third-party dependency notices: see [THIRD_PARTY_NOTICES.txt](./THIRD_PARTY_NOTICES.txt).
