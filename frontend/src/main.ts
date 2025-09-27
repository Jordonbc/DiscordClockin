import { configureBaseUrl, configureDiscordLogin, configureGuild } from "./configuration";
import { connectEventStream } from "./eventStream";
import { renderHolidayRequests } from "./ui/myTime";
import { startTimeClockTicker } from "./ui/dashboard";
import { bindEvents } from "./eventBindings";
import { hydrateDiscordSession } from "./discordAuth";
import { renderAuthState } from "./authState";
import { showToast } from "./ui/notifications";
import { state } from "./state";
import { switchView } from "./navigation";
import {
  refreshHolidays,
  refreshMyTime,
  loadAdminHolidays,
  loadAdminTimesheets,
} from "./timesheetData";

export function initialize(): void {
  configureBaseUrl();
  configureDiscordLogin();
  configureGuild();

  connectEventStream();

  if (!state.baseUrl) {
    showToast("Backend connection is not configured.", "error");
  }

  startTimeClockTicker();
  bindEvents();
  renderAuthState();
  renderHolidayRequests();

  window.addEventListener("clockin:view-changed", (event) => {
    const target = (event as CustomEvent<string>).detail;
    if (!target) return;

    if (target === "my-time") {
      void refreshMyTime();
      refreshHolidays();
    } else if (target === "time-clock" || target === "hours-report") {
      void refreshMyTime();
    } else if (target === "admin") {
      void loadAdminTimesheets();
      loadAdminHolidays();
    }
  });

  window.addEventListener("clockin:timesheet-updated", () => {
    renderAuthState();
  });

  hydrateDiscordSession().then(() => {
    if (state.user && state.baseUrl && state.guildId) {
      switchView("my-time");
    }
  });
}
