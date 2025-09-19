# Repository Guidelines

## Project Structure & Module Organization
The bot lives in `src/`, with Discord surfaces split into `commands/`, `events/`, and `handlers/`; reusable helpers sit in `utils/`, persistent models under `models/`, and queue-backed jobs in `workers/`. Top-level assets include `config.json` for channel and guild IDs plus a `Dockerfile` for container builds. Keep new modules colocated with the surface they serve; for example, slash command flows belong in `src/commands` alongside their shared utilities.

## Build, Test, and Development Commands
Run `npm install` in the repo root to pull dependencies. Use `node src/index.js` for a local bot run against your `.env`. `docker compose up report_bot` (from the monorepo root) starts the containerized stack with Redis. The default `npm test` placeholder fails intentionally—skip it unless you have added real specs.

## Coding Style & Naming Conventions
Stick with CommonJS (`require`/`module.exports`), two-space indentation, and double-quoted strings. Use `camelCase` for functions and helpers, `PascalCase` for classes, and `SCREAMING_SNAKE_CASE` for environment variables. File names should describe their feature (`attendanceReport.command.js`, `holidayWorker.js`) and reside in the appropriate surface directory.

## Testing Guidelines
There is no automated suite yet; validate changes manually in a staging guild. Exercise queue flows through Redis by running the relevant worker (`node src/workers/index.js`) and simulating payloads where possible. Document manual test steps in your PR so others can recreate them. Add Jest specs under `__tests__/` if you introduce logic heavy modules, and update the `npm test` script accordingly.

## Commit & Pull Request Guidelines
Follow brief, action-oriented commits (`feat(report): add overtime summary`) and link Discord tickets where relevant. PRs should explain scope, list manual validation steps, highlight affected queues or models, and attach screenshots for embed or message changes. Call out new env vars or config updates so deploys can sync secrets.

## Security & Configuration Tips
Populate `.env` with `TOKEN`, `MONGO_URL`, and Redis connection details; never commit secrets. Mirror any config edits in `config.json` with the deployment environment before merging. Rotate credentials after leaks and record on-call contacts in this file if responsibilities shift.
