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
import { refreshHolidays, refreshMyTime } from "./timesheetData";
import { loadAdminOverview } from "./adminData";
import { renderAdminOverview } from "./ui/admin";
import { loadProfile } from "./profileData";
import { renderProfileView } from "./ui/profile";

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
  renderAdminOverview();

  window.addEventListener("clockin:view-changed", (event) => {
    const target = (event as CustomEvent<string>).detail;
    if (!target) return;

    if (target === "my-time") {
      void refreshMyTime();
      refreshHolidays();
    } else if (target === "time-clock" || target === "hours-report") {
      void refreshMyTime();
    } else if (target === "admin") {
      void loadAdminOverview();
    } else if (target === "profile") {
      void loadProfile();
    }
  });

  window.addEventListener("clockin:timesheet-updated", () => {
    renderAuthState();
    renderProfileView();
  });

  hydrateDiscordSession().then(() => {
    if (state.user && state.baseUrl && state.guildId) {
      switchView("my-time");
    }
  });
}
