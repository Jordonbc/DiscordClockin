import { state } from "../state";
import { myTimeEntries, holidayList } from "../dom";
import { formatDateTime, formatDuration } from "../utils/formatters";
import { renderTimeClockPage } from "./dashboard";

export function renderMyTime(): void {
  if (!myTimeEntries) return;
  myTimeEntries.innerHTML = "";

  if (state.workerError) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "muted";
    cell.textContent = state.workerError;
    row.appendChild(cell);
    myTimeEntries.appendChild(row);
    renderTimeClockPage();
    return;
  }

  if (!state.userEntries.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "muted";
    cell.textContent = "No shifts to display.";
    row.appendChild(cell);
    myTimeEntries.appendChild(row);
    renderTimeClockPage();
    return;
  }

  state.userEntries.forEach((entry) => {
    const row = document.createElement("tr");

    const startCell = document.createElement("td");
    startCell.textContent = formatDateTime(entry.start);

    const endCell = document.createElement("td");
    endCell.textContent = formatDateTime(entry.end);

    const durationCell = document.createElement("td");
    durationCell.textContent = formatDuration(entry.start, entry.end);

    const statusCell = document.createElement("td");
    statusCell.textContent = entry.status || (entry.end ? "Completed" : "Active");

    row.append(startCell, endCell, durationCell, statusCell);
    myTimeEntries.appendChild(row);
  });

  renderTimeClockPage();
}

export function renderHolidayRequests(): void {
  if (!holidayList) return;
  holidayList.innerHTML = "";

  const item = document.createElement("li");
  item.className = "timeline__item muted";
  item.textContent = "Holiday requests are managed directly in Discord.";
  holidayList.appendChild(item);
}
