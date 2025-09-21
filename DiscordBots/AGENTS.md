# Repository Guidelines

## Project Structure & Module Organization
Runbook for the unified Discord clockin bot. The module lives in `clockin/`, which retains its own `AGENTS.md`, `config.json`, and Docker build context. Shared assets such as queue definitions live under `clockin/functions` and UI artifacts under `clockin/buttons`, `publicSlashCommands`, and `assets`-style folders. Top-level `docker-compose.yml` wires the bot to a Redis service, while `.env` templates (for example `clockin/example.env`) document required secrets.

## Build, Test, and Development Commands
Use `npm install` inside `clockin/` to restore dependencies. Run `node index.js` in `clockin/` to start the bot locally against your `.env`. `docker compose build` updates the bot image; `docker compose up clockin_bot` starts the stack with Redis. The repository does not ship automated test scripts yet, so CI failures typically stem from lint or runtime errors.

## Coding Style & Naming Conventions
Follow the existing Node.js style: two-space indentation, double-quoted strings, and `camelCase` for functions, helpers, and file names. Reserve `PascalCase` for classes and `SCREAMING_SNAKE_CASE` for environment variables. Prefer small, composable modules under `/functions`, `/handlers`, and `/events`, and colocate command definitions beneath `commands/` or `slashCommands/` to stay aligned with Discord command registration.

## Testing Guidelines
Manual verification is the norm today. Before shipping, connect to a staging guild and validate presence updates, queue processing, and logging. When adding new command handlers, consider capturing happy-path and error scenarios with lightweight Jest tests (place future specs under `__tests__`). Run Redis-backed flows locally via `docker compose up redis` and `node simulateUsers.js` to simulate traffic.

## Commit & Pull Request Guidelines
Commit history is short and imperative (`Improved rust`); continue using brief, action-oriented summaries (`feat(clockin): improve availability embeds`). Reference ticket IDs when available. Pull requests should outline intent, mention impacted surfaces, list manual test evidence, and include screenshots for embed or banner changes.

## Security & Configuration Tips
Never commit real `.env` files or production tokens. Keep service credentials in the runner-managed env paths referenced by `docker-compose.yml`. Rotate Discord tokens and MongoDB URIs after leaks, and document responsible contacts in the module’s `AGENTS.md` so on-call engineers know who to reach.
