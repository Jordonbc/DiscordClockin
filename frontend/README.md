# Frontend Console

The portal lives in this directory and can be hosted as a static site. It
provides a multi-panel experience inspired by modern workforce tools so end
users can manage shifts while admins review and approve requests without
touching Postman or cURL.

## Configuration

1. Copy `config.example.ts` to `config.ts` (or edit the existing file) and set
   `apiBaseUrl` to the full URL of your backend, e.g.
   `https://clockin.example.com/api` or `http://localhost:3000`.
2. Run `npm install` followed by `npm run build` to compile the TypeScript
   sources under `scripts/` and the runtime configuration into `dist/`.
3. Redeploy or refresh the page after updating the configuration.

The build step emits ES modules into `dist/`. You can integrate the compile
step into your existing deployment tooling or run `npm run watch` during local
development for automatic rebuilds.

## Running locally or hosting

The console ships with a lightweight Node server so you can host it with the
same runtime you already use for the Discord bot. From this folder run:

```bash
node server.js
```

The server listens on `0.0.0.0:5173` by default. To use a different interface
or port set the `HOST` and `PORT` environment variables, for example:

```bash
PORT=8080 HOST=127.0.0.1 node server.js
```

The Node server only serves static assets so you can also deploy it behind
process managers like PM2 alongside the rest of your stack.

Then open the printed URL in your browser. The portal automatically connects
using the configured `apiBaseUrl`.

## Using the dashboard

- **Navigation:** The sidebar switches between dashboard widgets, guild
  settings, role management, worker tools, shift control, timesheets, admin
  utilities, and the detailed activity log.
- **Connection badge:** The header shows the current backend status so you can
  confirm the configured URL is reachable.
- **Live insights:** The main dashboard shows a service status pill, request
  counters, and a rolling list of the five most recent actions. Use the quick
  action buttons to jump directly into common workflows.
- **Activity log:** Every request streams into the Activity view where you can
  inspect payloads. Use the “Clear activity” button in the sidebar to reset the
  counters and wipe log history.

All forms submit directly to the backend endpoints exposed by the ClockIn API,
so the console stays in sync with the existing routes.
