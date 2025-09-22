# DiscordClockin

## Running the project

The project is composed of three services:

- **Backend (Rust):** located in `backend/`, start with `cargo run`.
- **Discord bot (Node.js):** located in `DiscordBots/clockin/`, start with `node .`.
- **Frontend website:** located in `frontend/`, start with `npx serve .`.

To simplify local development, you can launch all three services at once from the repository root:

```bash
./run_services.sh
```

The script starts each service in the appropriate directory and keeps them running until you press <kbd>Ctrl</kbd> + <kbd>C</kbd>. When one service exits, the script shuts down the others so you can restart cleanly.
