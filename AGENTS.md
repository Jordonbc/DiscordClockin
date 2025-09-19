# Repository Guidelines

## Project Structure & Module Organization
Core runtime code lives in `clockin/index.js`, which wires Discord clients, connects to MongoDB, and loads feature modules. Interaction logic is grouped by surface: `commands/` for legacy message commands, `slashCommands/` and `publicSlashCommands/` for registered slash flows, `buttons/`, `modals/`, and `selectMenus/` for component handlers, and `events/` for gateway listeners. Shared helpers sit in `functions/` and `utils/`, while persistent models, queues, and assets live in `models/`, `queues/`, `fonts/`, and `icons/`. Scripts such as `addTestData.js`, `insertRoles.js`, and `simulateUsers.js` handle maintenance tasks.

## Build, Test, and Development Commands
Run `npm install` inside `clockin/` before first use. Start a development instance with `node index.js` (uses your `.env` secrets) or the watchdog loop `./clockin.sh` when you need automatic restarts. Use `node simulateUsers.js` to dry-run interaction flows without Discord traffic. Deployment relies on `./deploy.sh`, which pulls main and restarts the PM2 process; test it in a sandbox before touching production.

## Coding Style & Naming Conventions
Keep CommonJS modules with `require`/`module.exports`. Use 2-space indentation, trailing semicolons, and double-quoted strings, matching the existing style. Organize features by Discord surface and prefer descriptive filenames like `clockin.embed.js` instead of generic names. When adding shared logic, create a focused helper in `utils/` or `functions/` and export a single responsibility per file.

## Testing Guidelines
There is no automated test suite yet—the default `npm test` fails intentionally. Exercise new flows with a staging guild and confirm state via MongoDB and Redis dashboards. For load-sensitive changes, extend `simulateUsers.js` with the scenarios you need and log timings. Document manual test steps in the pull request so others can repeat them.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits (`fix(scope): message`), so keep that pattern for clarity and changelog generation. Keep commits focused and reference Discord ticket IDs or issue numbers where possible. Pull requests should summarize intent, list validation steps, attach screenshots of user-facing embeds, and call out migrations or new env vars. Always ensure `.env` changes are mirrored in deployment secrets before requesting review.

## Configuration & Security Notes
Required environment variables include `TOKEN`, `MONGO_URL`, and any Redis credentials referenced in `queues/`. Never hard-code secrets; use `.env` locally and the platform secret store in production. Review `config.json` and `log.js` when adjusting channels or logging behavior, keeping sensitive IDs out of the repo.
