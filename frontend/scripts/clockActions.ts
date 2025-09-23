import { state } from "./state.js";
import { showToast } from "./ui/notifications.js";
import { apiRequest, ensureGuildConfigured } from "./apiClient.js";
import { refreshMyTime } from "./timesheetData.js";
import { hasActiveSession, openClockOutModal } from "./ui/clockControls.js";

export async function performClockIn(): Promise<void> {
  if (!state.user) {
    showToast("Sign in before clocking in.", "info");
    return;
  }

  try {
    ensureGuildConfigured();
  } catch (error) {
    return;
  }

  try {
    await apiRequest({
      path: "shifts/start",
      method: "POST",
      body: {
        guild_id: state.guildId,
        user_id: state.user.id,
        source: "web_app",
      },
    });
    showToast("Clocked in.", "success");
    await refreshMyTime();
  } catch (error) {
    // handled globally
  }
}

export function promptClockOut(): void {
  if (!state.user) {
    showToast("Sign in before clocking out.", "info");
    return;
  }

  try {
    ensureGuildConfigured();
  } catch (error) {
    return;
  }

  if (!hasActiveSession()) {
    showToast("No active shift to clock out from.", "info");
    return;
  }

  openClockOutModal();
}
