import { connectionIndicator } from "./dom.js";
import { state } from "./state.js";

export interface ConnectionStatus {
  ok: boolean;
  message?: string;
}

export function updateConnectionIndicator(status: ConnectionStatus): void {
  if (!connectionIndicator) return;

  const message = status.ok ? "" : status.message || "Offline";
  connectionIndicator.textContent = message;

  if (status.ok) {
    connectionIndicator.title = state.baseUrl
      ? "Connected to configured backend"
      : "Connected";
  } else {
    connectionIndicator.title = message;
  }

  connectionIndicator.classList.toggle("status-pill--success", Boolean(status.ok));
  connectionIndicator.classList.toggle("status-pill--error", !status.ok);
  connectionIndicator.classList.toggle("status-pill--idle", false);
}
