# Repository Guidelines

## Project Structure & Module Organization
Runbook for three Discord bots: `clockin/`, `Holiday Segritude/`, and `Report Segritude/`. Each module keeps its own `AGENTS.md` for bot-specific notes, a `config.json`, and Docker build context. Shared assets such as queue definitions live under `clockin/functions` and UI artifacts under `clockin/buttons`, `publicSlashCommands`, and `assets`-style folders. Top-level `docker-compose.yml` wires the bots to a common Redis service, while `.env` templates (for example `clockin/example.env`) document required secrets.

## Build, Test, and Development Commands
Use `npm install` inside each bot directory to restore dependencies. Run `node index.js` in `clockin/` or `node src/index.js` in the holiday and reporter bots to start them locally against your `.env`. `docker compose build` updates all bot images; `docker compose up clockin_bot` starts the clock-in stack with Redis. The repository does not ship automated test scripts yet, so CI failures typically stem from lint or runtime errors.

## Coding Style & Naming Conventions
Follow the existing Node.js style: two-space indentation, double-quoted strings, and `camelCase` for functions, helpers, and file names. Reserve `PascalCase` for classes and `SCREAMING_SNAKE_CASE` for environment variables. Prefer small, composable modules under `/functions`, `/handlers`, and `/events`, and colocate command definitions beneath `commands/` or `slashCommands/` to stay aligned with Discord command registration.

## Testing Guidelines
Manual verification is the norm today. Before shipping, connect to a staging guild and validate presence updates, queue processing, and logging. When adding new command handlers, consider capturing happy-path and error scenarios with lightweight Jest tests (place future specs under `__tests__`). Run Redis-backed flows locally via `docker compose up redis` and `node simulateUsers.js` to simulate traffic.

## Commit & Pull Request Guidelines
Commit history is short and imperative (`Improved rust`); continue using brief, action-oriented summaries (`feat: add holiday digest scheduler`). Reference ticket IDs when available. Pull requests should outline scope, mention impacted bots, list manual test evidence, and include screenshots for embed or banner changes. Cross-link updates between bot directories in the PR description when changes span multiple services.

## Security & Configuration Tips
Never commit real `.env` files or production tokens. Keep service credentials in the runner-managed env paths referenced by `docker-compose.yml`. Rotate Discord tokens and MongoDB URIs after leaks, and document responsible contacts in each module’s `AGENTS.md` so on-call engineers know who to reach.
