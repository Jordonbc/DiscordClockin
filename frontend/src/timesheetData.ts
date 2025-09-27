import { state } from "./state";
import { showToast } from "./ui/notifications";
import { renderMyTime, renderHolidayRequests } from "./ui/myTime";
import { renderDashboardOverview, renderHoursReport } from "./ui/dashboard";
import { calculateDurationMinutes } from "./utils/time";
import { apiRequest, ensureGuildConfigured } from "./apiClient";
import { updateClockStatus } from "./clockStatusManager";
import { updateConnectionIndicator } from "./connectionStatus";

export async function refreshMyTime(): Promise<void> {
  if (!state.user) return;
  const previousError = state.workerError;

  if (!state.guildId) {
    state.workerProfile = null;
    state.activeSession = null;
    state.timeMetrics = null;
    state.userEntries = [];
    state.payroll = null;
    state.workerError = "Guild ID is not configured.";
    renderMyTime();
    renderDashboardOverview();
    updateClockStatus();
    return;
  }

  try {
    const path = `timesheets/${encodeURIComponent(state.guildId)}/${encodeURIComponent(
      state.user.id,
    )}`;
    const data = await apiRequest({ path, silent: true });
    const sessions = Array.isArray((data as any)?.sessions) ? (data as any).sessions : [];
    state.userEntries = sessions
      .map((session: any) => ({
        start: session.started_at_ms ?? null,
        end: session.ended_at_ms ?? null,
        status: session.ended_at_ms ? "Completed" : "Active",
        durationMinutes:
          typeof session.duration_minutes === "number"
            ? session.duration_minutes
            : calculateDurationMinutes(session.started_at_ms, session.ended_at_ms),
        summary:
          typeof session.summary === "string" && session.summary.trim()
            ? session.summary.trim()
            : null,
      }))
      .sort((a, b) => {
        const aTime = a.start ? new Date(a.start).getTime() : 0;
        const bTime = b.start ? new Date(b.start).getTime() : 0;
        return bTime - aTime;
      });
    state.workerProfile = (data as any)?.worker || null;
    state.activeSession = (data as any)?.active_session || null;
    state.timeMetrics = (data as any)?.metrics || null;
    state.payroll = (data as any)?.payroll || null;
    state.workerError = null;
  } catch (error: any) {
    state.workerProfile = null;
    state.activeSession = null;
    state.timeMetrics = null;
    state.userEntries = [];
    state.payroll = null;

    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      const missingMessage = "No worker record found. Ask an admin to register you.";
      state.workerError = missingMessage;
      updateConnectionIndicator({ ok: true });
      if (previousError !== missingMessage) {
        showToast(missingMessage, "info");
      }
    } else {
      state.workerError = null;
      if (!error || typeof error !== "object" || error.status !== 404) {
        showToast("Failed to load timesheet.", "error");
      }
    }
  }

  renderMyTime();
  renderDashboardOverview();
  renderHoursReport();
  updateClockStatus();
  if (state.user) {
    window.dispatchEvent(new CustomEvent("clockin:timesheet-updated"));
  }
}

export function refreshHolidays(): void {
  renderHolidayRequests();
}

