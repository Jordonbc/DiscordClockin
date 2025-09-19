# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, with `src/index.js` wiring the Discord client and loading event handlers via `src/handlers`. Interaction flows are grouped beneath `src/commands` and `src/events`—keep new commands in the relevant subfolder (for example, `src/commands/misc`) and register listeners alongside existing modules. Persistent data models reside in `src/models`, utility helpers in `src/utils`, and background workers in `src/workers`. Keep service configuration in `config.json`, and update the top-level `Dockerfile` when container behavior changes.

## Build, Test, and Development Commands
Run `npm install` after cloning to restore dependencies. Use `node src/index.js` to launch the Holiday Segritude bot locally with your `.env`. For container parity, run `docker compose up holiday_bot`; rebuild the image with `docker compose build`. There is no automated test target—`npm test` is intentionally undefined—so plan for manual validation before merging.

## Coding Style & Naming Conventions
Stick with CommonJS (`require`/`module.exports`), two-space indentation, double-quoted strings, and trailing semicolons. Name files by responsibility (`holidayDigest.command.js`, `welcome.worker.js`) and keep modules focused on a single export. Use `camelCase` for functions, `PascalCase` for classes, and `SCREAMING_SNAKE_CASE` for environment variables. Mirror existing folder structure when adding new surfaces or helpers.

## Testing Guidelines
Manually exercise new features in a staging Discord guild, watching bot logs for errors and verifying state changes against MongoDB or Redis when relevant. Validate worker jobs by running them locally with mocked schedules and capturing timing in logs. Document the scenarios you exercised and expected outcomes in your pull request so reviewers can reproduce them.

## Commit & Pull Request Guidelines
Repository history favors short, imperative commits (for example, `feat: add holiday digest scheduler`). Keep commits focused, reference ticket IDs when available, and avoid mixing unrelated changes. Pull requests should summarize intent, list impacted Discord surfaces or workers, describe manual validation steps, and attach screenshots for user-facing embeds or modals. Call out new environment variables or config edits so deployment secrets stay in sync.

## Security & Configuration Tips
Never commit real secrets. Create a local `.env` that supplies `TOKEN`, `MONGO_URL`, and any Redis credentials referenced in workers. Keep `config.json` free of production-only IDs, and coordinate secret rotations with the bot operators listed in team runbooks. Review Docker and Compose changes with Ops before deploying.
