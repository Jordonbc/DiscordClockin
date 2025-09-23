import { state } from "../state.js";
import { adminHolidayList, adminTimesheetRows } from "../dom.js";
import { formatDateTime, formatDuration } from "../utils/formatters.js";

export function renderAdminTimesheets(): void {
  if (!adminTimesheetRows) return;
  adminTimesheetRows.innerHTML = "";

  if (!state.adminTimesheetMemberId) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "muted";
    cell.textContent = "Submit a search to view entries.";
    row.appendChild(cell);
    adminTimesheetRows.appendChild(row);
    return;
  }

  if (!state.adminTimesheets.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "muted";
    cell.textContent = "No sessions found for this member.";
    row.appendChild(cell);
    adminTimesheetRows.appendChild(row);
    return;
  }

  state.adminTimesheets.forEach((entry) => {
    const row = document.createElement("tr");

    const memberCell = document.createElement("td");
    memberCell.textContent =
      (state.adminTimesheetWorker && state.adminTimesheetWorker.user_id) ||
      entry.memberId ||
      "Unknown";

    const startCell = document.createElement("td");
    startCell.textContent = formatDateTime(entry.start);

    const endCell = document.createElement("td");
    endCell.textContent = formatDateTime(entry.end);

    const durationCell = document.createElement("td");
    durationCell.textContent = formatDuration(entry.start, entry.end);

    const statusCell = document.createElement("td");
    const currentStatus = state.adminTimesheetWorker?.status;
    statusCell.textContent = entry.status || currentStatus || "—";

    row.append(memberCell, startCell, endCell, durationCell, statusCell);
    adminTimesheetRows.appendChild(row);
  });
}

export function renderAdminHolidays(): void {
  if (!adminHolidayList) return;
  adminHolidayList.innerHTML = "";

  const item = document.createElement("li");
  item.className = "timeline__item muted";
  item.textContent = "Holiday approvals are managed within Discord moderation tools.";
  adminHolidayList.appendChild(item);
}
