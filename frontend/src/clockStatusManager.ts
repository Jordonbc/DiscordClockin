import { clockMessage, clockState, dashboardClockMessage, dashboardClockStatus } from "./dom";
import { state } from "./state";
import { ClockStatus, setLastClockStatus } from "./clockStatus";
import { formatDateTime } from "./utils/formatters";
import { updateClockControlsVisibility } from "./ui/clockControls";
import { renderDashboardOverview, renderTimeClockPage } from "./ui/dashboard";

function buildWaitingStatus(): ClockStatus {
  return {
    label: "Waiting",
    className: "status-pill status-pill--idle",
    message: "Sign in to manage your shift.",
  };
}

export function resolveClockStatus(): ClockStatus {
  if (!state.user) {
    return buildWaitingStatus();
  }

  if (!state.guildId) {
    return {
      label: "Unknown",
      className: "status-pill status-pill--error",
      message: "Configure a guild ID to load your status.",
    };
  }

  if (!state.workerProfile) {
    return {
      label: "Unknown",
      className: "status-pill status-pill--error",
      message: state.workerError || "No worker record found. Ask an admin to register you.",
    };
  }

  const workerStatus = String(state.workerProfile.status || "").toLowerCase();
  const activeEntry = state.userEntries.find((entry) => !entry.end);

  if (workerStatus === "work") {
    const startedAt = state.activeSession?.started_at_ms || activeEntry?.start || null;
    return {
      label: "Active",
      className: "status-pill status-pill--success",
      message: startedAt
        ? `Clocked in at ${formatDateTime(startedAt)}.`
        : "You're currently clocked in.",
    };
  }

  if (workerStatus === "break") {
    const startedAt = state.activeSession?.started_at_ms || null;
    return {
      label: "On break",
      className: "status-pill status-pill--idle",
      message: startedAt
        ? `On break since ${formatDateTime(startedAt)}.`
        : "You're currently on break.",
    };
  }

  const latest = state.userEntries[0];
  return {
    label: "Offline",
    className: "status-pill status-pill--idle",
    message: latest?.end
      ? `Last shift ended ${formatDateTime(latest.end)}.`
      : "You're clocked out.",
  };
}

export function updateClockStatus(): void {
  updateClockControlsVisibility();

  const status = resolveClockStatus();
  setLastClockStatus(status);

  if (clockState) {
    clockState.textContent = status.label;
    clockState.className = status.className;
  }

  if (clockMessage) {
    clockMessage.textContent = status.message;
  }

  if (dashboardClockStatus) {
    dashboardClockStatus.textContent = status.label;
    dashboardClockStatus.className = status.className;
  }

  if (dashboardClockMessage) {
    dashboardClockMessage.textContent = status.message;
  }

  renderTimeClockPage();
  renderDashboardOverview();
}
