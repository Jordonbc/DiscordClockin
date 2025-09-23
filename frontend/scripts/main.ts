import { configureBaseUrl, configureDiscordLogin, configureGuild } from "./configuration.js";
import { connectEventStream } from "./eventStream.js";
import { renderHolidayRequests } from "./ui/myTime.js";
import { startTimeClockTicker } from "./ui/dashboard.js";
import { bindEvents } from "./eventBindings.js";
import { hydrateDiscordSession } from "./discordAuth.js";
import { renderAuthState } from "./authState.js";
import { showToast } from "./ui/notifications.js";
import { state } from "./state.js";
import { switchView } from "./navigation.js";
import {
  refreshHolidays,
  refreshMyTime,
  loadAdminHolidays,
  loadAdminTimesheets,
} from "./timesheetData.js";

function initialize(): void {
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

initialize();
