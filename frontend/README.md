# Frontend Console

The operations console lives in this directory and can be hosted as a static
site. It provides a multi-panel dashboard inspired by modern workforce tools so
you can observe backend health and trigger management actions without touching
Postman or cURL.

## Configuration

1. Copy `config.example.js` to `config.js` (or edit the existing file) and set
   `apiBaseUrl` to the full URL of your backend, e.g.
   `https://clockin.example.com/api` or `http://localhost:3000`.
2. Redeploy or refresh the page after updating the configuration.

The file is loaded as a regular script tag so you can also replace it with your
own build step that injects environment-specific values.

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

Then open the printed URL in your browser. The console automatically connects
using the configured `apiBaseUrl`, but you can update it from the UI at any
time.

## Using the dashboard

- **Navigation:** The sidebar switches between dashboard widgets, guild
  settings, role management, worker tools, shift control, timesheets, admin
  utilities, and the detailed activity log.
- **Connection badge:** Set or change the API base URL from the header. A green
  status confirms the console is ready; red indicates the backend URL still
  needs to be configured.
- **Live insights:** The main dashboard shows a service status pill, request
  counters, and a rolling list of the five most recent actions. Use the quick
  action buttons to jump directly into common workflows.
- **Activity log:** Every request streams into the Activity view where you can
  inspect payloads. Use the “Clear activity” button in the sidebar to reset the
  counters and wipe log history.

All forms submit directly to the backend endpoints exposed by the ClockIn API,
so the console stays in sync with the existing routes.
