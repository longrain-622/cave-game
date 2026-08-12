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
npm run dev        # Development mode (http://localhost:3000)
npm run build      # Build dist (runs tsc first automatically)
npm run serve:dist # Preview the build locally (http://localhost:8080)
npm test           # Run unit tests (vitest)
npm run typecheck  # Type-check src + test (recommended before committing)
```

## Project Structure

```
├── src/         TypeScript source code
│   ├── apiox/        Web API wrapper layer (browser APIs must go through this layer; direct use is prohibited)
│   ├── constants/    Constants and shared leaf modules (incl. settingConfig, i18nLang)
│   ├── contentRoom/  Menu, world management, settings UI logic
│   ├── gameRoom/     The game itself (world, player, rendering, GUI, block mechanics, animals, etc.)
│   ├── others/       General modules such as i18n
│   ├── types/        Type definitions
│   └── user/         Save/load
├── js/           tsc output (ESM, loaded directly by the browser at runtime, gitignored)
├── css/          Global styles (directly @import-ed by index.html)
├── assets/       Game assets (images, sounds, locale files, fonts)
├── test/         Vitest unit tests
└── dist/         Vite build output (gitignored)
```

## Architecture Notes (Important)

This project uses a **dual-directory pattern**, unlike a typical Vite project:

- **Source/runtime split**: `src/` is compiled by tsc into `js/`, and the browser **loads the ESM output in `js/` directly** (the `index.html` importmap resolves `pixi.js`/`localforage`).
- **The game chain is loaded at runtime**: the 15 modules of the game itself are **dynamically imported by `LoadScripts` via absolute paths (`/js/gameRoom/**`)**, bypassing the bundler. Therefore, changes in `src/` require recompilation to take effect (`npm run build` already runs tsc automatically).
- **What dist contains**: the bundled shell (UI) plus mirrors of `js/`, `assets/`, and the pixi/localforage dependencies from `node_modules`. A missing runtime dependency fails the build outright instead of producing a broken output.

> Dev workflow: `npm run dev` (Vite static server) + run `npx tsc` manually to compile `src/` changes when needed; or use `npm run build` to compile and build in one command.

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
