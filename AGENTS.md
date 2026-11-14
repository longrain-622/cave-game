# Project AI Instructions File

## Project Overview
This is a [2D pixel game] project.

## Tech Stack
- Frontend: [PixiJS] [localforage.js]
- Package Manager: [npm]

## Key Constraints (Must Follow)

### 1. Package Management
- Use `[npm]` consistently; mixing other package managers is prohibited.

### 2. Code Style
- Indentation: Use [4] spaces.
- Strings: Prefer single quotes.
- Semicolons: [Required].

### 3. Naming Conventions
- File names: `camelCase`.
- Variables/functions: `camelCase`.

### 4. Game Room Pure Logic Boundary
- In `./src/gameRoom`, all code outside `game.ts` and the `rendering/`, `net/`, `others/`, and `input/` directories must be pure logic only. It must be fully independent, must not depend on any non-pure-logic modules (rendering, networking, interaction, etc.), must be able to run independently in Node, and must not contain any rendering, interaction, or other non-pure-logic code.

## Notes
- [ ] Absolutely prohibited to run any tests (including browser automation, dev server verification, or `npm test`/`vitest`) without explicit user permission.
- [ ] Do not directly modify files in the `dist/` or `build/` directories.
- [ ] When API interfaces change, update the API documentation accordingly.
- [ ] Do not write Web APIs code directly; instead, use the wrapper in `src/apiox`.
- [ ] At the top level of a module, only declarative constructs such as variables, arrays, and interfaces are permitted. All other executable code or business logic must be encapsulated within standalone functions or the main entry function.
- [ ] Run `npm run typecheck` before committing (validates `src/` and `test/` with `tsc --noEmit`).