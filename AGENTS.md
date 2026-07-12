# Repository guide

Scene Map is a React 19 + TypeScript frontend with an Express API and a local SQLite database.

- Frontend code lives in `src/`; API, persistence, and import logic live in `server/`.
- Use Node.js 24 and pnpm 10.12.1. Do not replace `pnpm-lock.yaml` with another package manager's lockfile.
- Keep changes focused and preserve the existing compact component and CSS style.
- Treat `data/scene-map.db` as local user data; never edit, delete, or commit it.
- Run `pnpm test` for server/database changes and `pnpm build` for all code changes.
- Add or update tests for behavioral changes where the current test setup supports them.
- Use Conventional Commit messages as documented in `CONTRIBUTING.md`.
