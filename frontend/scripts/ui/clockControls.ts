import { state } from "../state.js";
import {
  clockOutButton,
  clockOutModal,
  clockSummaryInput,
  userMenuButton,
  userMenu,
} from "../dom.js";

let userMenuIsOpen = false;

export function setUserMenuOpen(open: boolean): void {
  userMenuIsOpen = Boolean(open);
  if (userMenu) {
    userMenu.classList.toggle("user-menu--open", userMenuIsOpen);
  }
  if (userMenuButton) {
    userMenuButton.setAttribute("aria-expanded", userMenuIsOpen ? "true" : "false");
  }
}

export function closeUserMenu(): void {
  setUserMenuOpen(false);
}

export function toggleUserMenu(): void {
  setUserMenuOpen(!userMenuIsOpen);
}

export function isUserMenuOpen(): boolean {
  return userMenuIsOpen;
}

export function hasActiveSession(): boolean {
  if (!state.user) return false;
  if (state.activeSession) return true;
  return state.userEntries.some((entry) => !entry.end);
}

function handleClockOutModalKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    closeClockOutModal();
  }
}

export function openClockOutModal(): void {
  if (!clockOutModal) return;
  clockOutModal.hidden = false;
  if (document.body) {
    document.body.classList.add("modal-open");
  }
  document.addEventListener("keydown", handleClockOutModalKeydown);
  if (clockSummaryInput) {
    clockSummaryInput.disabled = false;
    clockSummaryInput.focus();
  }
}

export function closeClockOutModal(): void {
  if (!clockOutModal || clockOutModal.hidden) return;
  clockOutModal.hidden = true;
  if (document.body) {
    document.body.classList.remove("modal-open");
  }
  document.removeEventListener("keydown", handleClockOutModalKeydown);
  if (clockSummaryInput) {
    clockSummaryInput.blur();
    if (!hasActiveSession()) {
      clockSummaryInput.value = "";
      clockSummaryInput.disabled = true;
    }
  }
}

export function updateClockControlsVisibility(): void {
  const authed = Boolean(state.user);
  const active = authed && hasActiveSession();

  if (clockOutButton) {
    clockOutButton.hidden = !active;
    clockOutButton.disabled = !active;
  }

  if (clockSummaryInput) {
    clockSummaryInput.disabled = !active;
    if (!active) {
      clockSummaryInput.value = "";
    }
  }

  if (!active) {
    closeClockOutModal();
  }
}
