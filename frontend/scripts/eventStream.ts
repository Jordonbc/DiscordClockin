import { state } from "./state.js";
import { refreshMyTime } from "./timesheetData.js";

let eventSource: EventSource | null = null;
let eventStreamReconnectTimer: ReturnType<typeof setTimeout> | null = null;

function disconnectEventStream(): void {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  if (eventStreamReconnectTimer) {
    clearTimeout(eventStreamReconnectTimer);
    eventStreamReconnectTimer = null;
  }
}

function scheduleEventStreamReconnect(delayMs = 5000): void {
  if (eventStreamReconnectTimer) {
    return;
  }

  eventStreamReconnectTimer = setTimeout(() => {
    eventStreamReconnectTimer = null;
    connectEventStream();
  }, Math.max(1000, delayMs));
}

function handleHookEvent(event: any): void {
  if (!event || typeof event !== "object") return;

  if (event.guild_id && state.guildId && event.guild_id !== state.guildId) {
    return;
  }

  if (event.source === "web_app") {
    return;
  }

  const isSelf = state.user && event.user_id === state.user.id;
  if (!isSelf) {
    return;
  }

  refreshMyTime().catch(() => {});
}

export function connectEventStream(): void {
  if (typeof EventSource === "undefined") {
    return;
  }

  if (!state.baseUrl || !state.guildId) {
    disconnectEventStream();
    return;
  }

  const url = new URL("events/stream", state.baseUrl);
  url.searchParams.set("guild_id", state.guildId);
  url.searchParams.set("event", "clock_in,clock_out");

  disconnectEventStream();

  eventSource = new EventSource(url.toString());
  eventSource.onmessage = (event) => {
    if (!event?.data) return;
    try {
      const payload = JSON.parse(event.data);
      handleHookEvent(payload);
    } catch (error) {
      console.warn("Failed to parse hook event payload", error);
    }
  };
  eventSource.onerror = () => {
    disconnectEventStream();
    scheduleEventStreamReconnect();
  };
}
