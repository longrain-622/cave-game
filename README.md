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
| Testing | [Vitest](https://vitest.dev/) |

## Getting Started

Requirements: Node.js 20+ and npm.

```bash
npm install        # Install dependencies
npm run dev        # Development mode with HMR (http://localhost:3000)
npm run build      # Build dist with Vite
npm run preview    # Preview the build locally (http://localhost:4173)
npm test           # Run unit tests (vitest)
npm run typecheck  # Type-check src + test (recommended before committing)
```

> **Note**: The root `index.html` is the Vite build entry (it references `/src/*.ts`). It cannot be opened directly with a static file server or by double-clicking it (`file://`) — use `npm run dev` for development, and deploy or preview the `dist/` output from `npm run build`. Browsers run only the built `dist/` output.

## Project Structure

```
├── src/         TypeScript source code (the single source of truth)
│   ├── apiox/        Web API wrapper layer (browser APIs must go through this layer; direct use is prohibited)
│   ├── constants/    Constants and shared leaf modules (incl. settingConfig, i18nLang)
│   ├── contentRoom/  Menu, world management, settings UI logic
│   ├── gameRoom/     The game itself (world, player, rendering, GUI, block mechanics, animals, etc.)
│   ├── others/       General modules such as i18n
│   ├── types/        Type definitions
│   └── user/         Save/load
├── css/          Global styles (directly @import-ed by index.html)
├── public/assets/  Game assets (images, sounds, locale files, fonts) — Vite publicDir,
│                    copied verbatim to dist/assets/ and served at /assets/...
├── test/         Vitest unit tests
└── dist/         Vite build output (gitignored)
```

## Architecture Notes (Important)

Standard Vite single-source build:

- **One source tree, one bundler**: `src/` is the only source tree; Vite compiles and bundles it directly (no intermediate `js/` output, no manual compile step). `index.html` at the repo root loads `/src/*.ts` module entries.
- **The game chain is lazy-loaded**: the 15 game modules are dynamically imported by `LoadScripts` (and the game entry by `main`/`content`) via **relative dynamic imports**, so Vite code-splits them into async chunks that load only when the player enters the game room — preserving the original on-demand behavior.
- **Assets as `publicDir`**: `public/assets/` is Vite's `publicDir`, copied verbatim into `dist/assets/` and served at `/assets/...`. Runtime string paths (`PIXI.Assets`, `fetch`, `Audio`) are page-relative (`assets/...`) so they resolve identically in dev and after deploy.
- **Dependencies bundled normally**: `pixi.js` and `localforage` are resolved from `node_modules` by Vite (no importmap, no `dist/node_modules` mirroring, no `external`).

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
