# Copilot instructions for `nuzlocke.app`

## Project overview

- This is a **SvelteKit + Vite** app deployed with **`@sveltejs/adapter-vercel`**.
- The codebase is mostly **`.svelte` + `.js`**, with a smaller amount of **TypeScript** in some API routes and utilities.
- The app is primarily a **client-side tracker** backed by **localStorage**; server routes mainly provide generated game data, Pokémon data, battle helpers, and analytics ingestion.

## Start here

When you first open the repo, inspect these files before making changes:

1. `README.md` - contribution notes for route / league / patch data.
2. `package.json` - actual scripts and current validation limitations.
3. `src/lib/store.js` - localStorage schema, save serialization, and shared Svelte stores.
4. `src/lib/data/games.json` - master registry of supported games and ROM hacks.
5. `src/routes/api/` - backend endpoints used by the UI.
6. `vite.config.js` and `jsconfig.json` - aliases and build setup.

## Repo layout

- `src/routes/(app)/...` - main tracker UI pages.
- `src/routes/(guides)/...` - guide pages.
- `src/routes/api/...` - SvelteKit API endpoints.
- `src/lib/components/...` - reusable UI components.
- `src/lib/data/...` - checked-in JSON/JS data sources (`games.json`, `routes.json`, `league.json`, `patches.json`, etc.).
- `src/docs/*.md` - guide content for supported games.
- `static/` - public assets.

## Important conventions

- **Do not casually change `src/lib/store.js` formats or `IDS` keys.** Save data is stored in browser localStorage, so schema/key changes can break existing user data.
- The repo uses Vite aliases heavily:
  - `$lib`
  - `$docs`
  - `$c`
  - `$utils`
  - `$data`
  - `$store`
  - `$icons`
- Data additions for a new or updated game often touch multiple places together:
  - `src/lib/data/games.json`
  - one or more of `routes.json`, `league.json`, `patches.json`, `trainers.json`
  - `src/docs/<game>.md` when guide content is affected
- Route/API code is a mix of older and newer SvelteKit conventions. Example: grouped routes use `+page.svelte`, but the repo also still has `src/routes/index.html.svelte`. **Avoid framework-wide migrations unless the task explicitly requires them.**
- Avoid broad formatting/refactor passes in legacy Svelte files. Make surgical changes only.

## Validation workflow

Use the existing scripts exactly as written unless the task requires changing tooling.

### Baseline setup

- Install deps with `npm ci`

### Commands that worked during onboarding

- `npm run build`
- `npm run dev -- --host 127.0.0.1`
- `npm run test:randomiser`
- `npm run test:pokemon`

### Important validation caveats

- `npm run lint` currently reports **many pre-existing ESLint / parse errors** across untouched files. Treat lint output carefully and do not assume every failure was introduced by your change.
- `npm run test:randomiser` and `npm run test:pokemon` are **smoke tests that require the dev server to already be running** on `http://localhost:5173` (or equivalent local host/port).
- Those test scripts also depend on shell tools like **`curl`** and **`jq`**.
- `npm run test:league` is **not currently reliable**:
  - it requires **Deno**
  - and it references `./api/static/league/validate.ts`, which was **missing from the repo during onboarding**

## Known environment-sensitive areas

- `src/routes/api/store/[doc]/bigquery.ts` depends on multiple `VITE_BQ_*` environment variables for BigQuery ingestion. Avoid touching this path unless needed, and expect analytics-related behavior to depend on external credentials.
- `package.json` includes a GitHub dependency (`pokemon-sprites`), so `npm ci` can be slower than a pure npm-registry install.

## Errors encountered during onboarding and workarounds

- **`npm run lint` failed with many existing errors** in unrelated files.  
  **Workaround:** use `npm run build` plus targeted smoke tests for the area you changed, and only fix lint issues in files you intentionally modify.
- **`deno` was not installed in the sandbox**, so `npm run test:league` failed immediately.  
  **Workaround:** do not rely on that script unless you have Deno installed.
- **`npm run test:league` also points at a missing file**: `./api/static/league/validate.ts`.  
  **Workaround:** treat that script as stale until the repository restores or replaces the validator.

## Practical editing advice for agents

- For **UI changes**, inspect the matching page under `src/routes/(app)` and then the supporting component(s) under `src/lib/components`.
- For **game data issues**, start from `src/lib/data/games.json` and trace the relevant API route in `src/routes/api/`.
- For **save/import/export bugs**, inspect `src/lib/store.js` first.
- For **server/data pipeline work**, check whether the code path is plain JSON generation or the BigQuery ingestion route before changing anything.
- Prefer **small, local fixes** over repository-wide cleanup. This codebase has a fair amount of legacy surface area.
