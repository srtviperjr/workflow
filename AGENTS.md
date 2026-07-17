# AGENTS.md

## Cursor Cloud specific instructions

Jansen Workflows is a **frontend-only** React + TypeScript app (Vite, Material UI, React Flow). There is **no backend, database, or external API** — all state persists in the browser's `localStorage` (`src/data/storage.ts`), so there are no env vars or secrets to configure.

Standard commands live in `package.json` (`dev`, `build`, `lint`, `preview`). Notes:

- **Dev server**: `npm run dev` serves the app on port `5173` (host `0.0.0.0`, configured in `vite.config.ts`). This is the only service; it *is* the product.
- **Preview**: `npm run preview` serves a production build on port `4173` (requires `npm run build` first).
- **Lint**: `npm run lint` (oxlint) currently emits one pre-existing benign warning in `src/context/AppContext.tsx` (react-refresh only-export-components); it exits 0.
- **State reset**: because persistence is `localStorage`, use the in-app **Admin Tools** (Generate Sample Data / reset) to change data rather than editing files. The app boots as **System Admin** (`admin@jansen.local`); no login is required.
