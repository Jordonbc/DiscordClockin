# Repository Guidelines

## Project Structure & Module Organization
Core runtime logic lives in `index.js`, which boots the Discord client, connects to MongoDB, and loads feature modules. Interaction handlers are grouped by surface: `commands/`, `slashCommands/`, and `publicSlashCommands/` define command flows, while components sit under `buttons/`, `selectMenus/`, and `modals/`. Event listeners reside in `events/`, and shared helpers belong in `functions/` and `utils/`. Persistent data models are under `models/`, with queue definitions in `queues/`, and design assets in `fonts/`, `icons/`, and banner images at the repository root. Maintenance scripts such as `addTestData.js`, `insertRoles.js`, and `simulateUsers.js` support local setup and diagnostics.

## Build, Test, and Development Commands
Run `npm install` the first time you set up the repo. Start the bot locally with `node index.js` (expects a populated `.env`; see `example.env`). Use `./clockin.sh` for a watchdog loop that restarts on file changes. `node simulateUsers.js` exercises interaction flows without Discord traffic. Deployment is handled by `./deploy.sh`, which pulls the latest main branch and restarts the PM2 process—dry-run it in staging before production.

## Coding Style & Naming Conventions
Stick to CommonJS modules (`require`/`module.exports`), two-space indentation, trailing semicolons, and double-quoted strings. Use descriptive filenames that mirror the Discord surface, e.g., `clockin.embed.js`. Favor small, single-purpose helpers placed under `utils/` or `functions/`, and keep environment variable names in `SCREAMING_SNAKE_CASE`.

## Testing Guidelines
Automated tests are not yet wired—`npm test` is a placeholder. Validate changes manually against a staging guild, watching MongoDB and Redis state. For load-sensitive updates, extend `simulateUsers.js` with custom scenarios, log timings, and capture any anomalies for the pull request. Document manual verification steps so reviewers can reproduce them.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`fix(scope): message`) to align with recent history. Keep commits focused and reference relevant Discord ticket IDs when possible. Pull requests should summarize intent, list manual validation steps, and attach screenshots for embed or UI changes. Call out new environment variables or migrations explicitly and ensure `.env` updates are mirrored in the deployment secrets before requesting review.

## Security & Configuration Tips
Never commit real secrets. Required env vars include `TOKEN`, `MONGO_URL`, and Redis credentials referenced in `queues/`. Review `config.json` for channel IDs and keep sensitive identifiers in environment configuration. Rotate tokens promptly after incidents, and log operational contacts in the PR when ownership changes.
