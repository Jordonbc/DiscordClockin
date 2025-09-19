# Repository Guidelines

## Project Structure & Module Organization
Core runtime logic lives in `clockin/index.js`, which boots the Discord client, connects to MongoDB, and loads feature modules. Interaction handlers are grouped by surface: legacy commands in `commands/`, slash flows in `slashCommands/` and `publicSlashCommands/`, and component listeners in `buttons/`, `modals/`, and `selectMenus/`. Shared helpers reside in `functions/` and `utils/`, while persistence and assets sit in `models/`, `queues/`, `fonts/`, and `icons/`. Maintenance scripts such as `addTestData.js`, `insertRoles.js`, and `simulateUsers.js` live alongside the runtime under `clockin/`.

## Build, Test, and Development Commands
Run `npm install` inside `clockin/` before first use. Start a local bot with `node index.js` (reads your `.env`). Use `./clockin.sh` for a watchdog loop that restarts on changes. Dry-run interaction flows via `node simulateUsers.js`. Deploy with `./deploy.sh`, which pulls main and restarts the PM2 process; test the script in staging first.

## Coding Style & Naming Conventions
Code uses CommonJS (`require`/`module.exports`), 2-space indentation, trailing semicolons, and double-quoted strings. Favor descriptive filenames bound to Discord surfaces (e.g., `clockin.embed.js`). Keep helpers focused—one responsibility per file in `utils/` or `functions/`. Follow existing logging patterns in `log.js` when extending telemetry.

## Testing Guidelines
There is no automated suite; `npm test` fails by design. Validate changes manually in a staging guild, confirming state in MongoDB and Redis dashboards. For load-sensitive updates, extend `simulateUsers.js` with representative scenarios and log timings. Document manual validation steps in your pull request.

## Commit & Pull Request Guidelines
Commits follow Conventional Commits (e.g., `fix(clockin): handle stale sessions`) and should reference Discord tickets or issues. Pull requests should summarize intent, list validation steps, attach screenshots of user-facing embeds, and flag migrations or new environment variables. Ensure `.env` updates are mirrored in deployment secrets before requesting review.

## Security & Configuration Notes
Keep required env vars (`TOKEN`, `MONGO_URL`, Redis credentials) in `.env` locally and platform secrets in production. Avoid hard-coded IDs; adjust channel or logging behavior through `config.json`. Consult this guide when defining agent runbooks, owners, or escalation paths.
