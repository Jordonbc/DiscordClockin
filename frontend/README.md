# Frontend Console

The portal lives in this directory and can be hosted as a static site. It
provides a multi-panel experience inspired by modern workforce tools so end
users can manage shifts while admins review and approve requests without
touching Postman or cURL.

## Configuration

1. Copy `config.example.ts` to `config.ts` (or edit the existing file) and set
   `apiBaseUrl` to the full URL of your backend, e.g.
   `https://clockin.example.com/api` or `http://localhost:3000`.
2. Run `npm install` followed by `npm run build` to bundle the TypeScript
   sources under `src/` together with the runtime configuration. The compiled
   site is emitted into `dist/` and is ready to deploy to any static host.
3. Redeploy or refresh the page after updating the configuration.

The Vite toolchain also provides a dev server so you can iterate quickly. Run
`npm run dev` to start it and open the printed URL in your browser. Changes to
TypeScript, HTML fragments, or the runtime configuration hot-reload in place.

## Running locally or hosting

When you're ready to serve the production build locally run `npm run preview`.
It uses the same optimized bundle that `npm run build` emits and serves it on a
temporary local server so you can smoke-test before deploying.

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
