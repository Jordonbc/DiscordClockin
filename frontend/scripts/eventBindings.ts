import {
  adminHolidayForm,
  adminModifyHoursForm,
  adminRoleForm,
  adminTimesheetForm,
  clockInButton,
  clockOutButton,
  clockOutModalDismissButtons,
  clockOutModalForm,
  clockSummaryInput,
  heroLoginButton,
  authRequiredLoginButton,
  holidayForm,
  hoursReportExportButton,
  hoursReportCalendarGrid,
  hoursReportMonthSelect,
  hoursReportYearSelect,
  hoursReportThisMonthButton,
  hoursReportThisWeekButton,
  loginButton,
  logoutButton,
  hoursReportPickerToggle,
  hoursReportPickerPanel,
  hoursReportRangePicker,
  refreshAdminHolidays,
  refreshAdminTimesheets,
  refreshHolidaysButton,
  refreshMyTimeButton,
  timeClockActionButton,
  userMenu,
  userMenuAdmin,
  userMenuButton,
  userMenuDropdown,
  userMenuProfile,
} from "./dom.js";
import { state } from "./state.js";
import { showToast } from "./ui/notifications.js";
import {
  closeClockOutModal,
  closeUserMenu,
  hasActiveSession,
  isUserMenuOpen,
  toggleUserMenu,
} from "./ui/clockControls.js";
import { bindNavigation, switchView } from "./navigation.js";
import { initiateLogin, clearDiscordSession } from "./discordAuth.js";
import { performClockIn, promptClockOut } from "./clockActions.js";
import {
  loadAdminHolidays,
  loadAdminTimesheets,
  refreshHolidays,
  refreshMyTime,
} from "./timesheetData.js";
import { ensureGuildConfigured, apiRequest } from "./apiClient.js";
import { renderAuthState } from "./authState.js";
import { renderHoursReport } from "./ui/dashboard.js";
import { canAccessAdmin } from "./permissions.js";

const DAY_IN_MS = 86400000;

export function bindEvents(): void {
  bindNavigation();

  if (heroLoginButton) {
    heroLoginButton.addEventListener("click", () => {
      if (state.user) {
        switchView("my-time");
      } else {
        initiateLogin();
      }
    });
  }

  if (loginButton) {
    loginButton.addEventListener("click", initiateLogin);
  }

  if (authRequiredLoginButton) {
    authRequiredLoginButton.addEventListener("click", initiateLogin);
  }

  const rangePickerElementsReady =
    Boolean(hoursReportPickerToggle) &&
    Boolean(hoursReportPickerPanel) &&
    Boolean(hoursReportRangePicker);

  const isRangePickerOpen = () =>
    Boolean(hoursReportPickerPanel && !hoursReportPickerPanel.hidden);

  const focusCalendarDay = () => {
    if (!hoursReportCalendarGrid) return;
    const activeDay =
      hoursReportCalendarGrid.querySelector<HTMLButtonElement>(
        ".report-range-picker__day.is-range-start"
      ) ||
      hoursReportCalendarGrid.querySelector<HTMLButtonElement>(
        ".report-range-picker__day.is-selected"
      ) ||
      hoursReportCalendarGrid.querySelector<HTMLButtonElement>(
        ".report-range-picker__day:not(.is-outside)"
      );
    if (activeDay) {
      activeDay.focus();
    }
  };

  const openRangePicker = () => {
    if (!rangePickerElementsReady || !hoursReportPickerToggle || !hoursReportPickerPanel || !hoursReportRangePicker) {
      return;
    }
    hoursReportPickerPanel.hidden = false;
    hoursReportPickerToggle.setAttribute("aria-expanded", "true");
    hoursReportRangePicker.classList.add("report-range-picker--open");
    focusCalendarDay();
  };

  const closeRangePicker = () => {
    if (!rangePickerElementsReady || !hoursReportPickerToggle || !hoursReportPickerPanel || !hoursReportRangePicker) {
      return;
    }
    if (hoursReportPickerPanel.hidden) return;
    hoursReportPickerPanel.hidden = true;
    hoursReportPickerToggle.setAttribute("aria-expanded", "false");
    hoursReportRangePicker.classList.remove("report-range-picker--open");
  };

  if (rangePickerElementsReady && hoursReportPickerToggle && hoursReportPickerPanel) {
    hoursReportPickerToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isRangePickerOpen()) {
        closeRangePicker();
      } else {
        openRangePicker();
      }
    });

    hoursReportPickerPanel.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  if (userMenuButton) {
    userMenuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!state.user) return;
      toggleUserMenu();
    });
  }

  if (userMenuDropdown) {
    userMenuDropdown.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  if (userMenuProfile) {
    userMenuProfile.addEventListener("click", () => {
      if (!state.user) {
        closeUserMenu();
        showToast("Sign in to view your profile.", "info");
        return;
      }
      closeUserMenu();
      switchView("my-time");
    });
  }

  if (userMenuAdmin) {
    userMenuAdmin.addEventListener("click", () => {
      closeUserMenu();
      if (!canAccessAdmin()) {
        showToast("Admin access is required.", "info");
        return;
      }
      switchView("admin");
    });
  }

  document.addEventListener("click", (event) => {
    if (isRangePickerOpen()) {
      if (
        hoursReportRangePicker &&
        event.target instanceof Node &&
        hoursReportRangePicker.contains(event.target)
      ) {
        // internal click keeps picker open
      } else {
        closeRangePicker();
      }
    }

    if (!isUserMenuOpen()) return;
    if (userMenu && event.target instanceof Node && userMenu.contains(event.target)) {
      return;
    }
    closeUserMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeUserMenu();
      closeClockOutModal();
      closeRangePicker();
    }
  });

  document.addEventListener("focusin", (event) => {
    if (!isRangePickerOpen()) return;
    if (event.target instanceof Node) {
      if (hoursReportRangePicker && hoursReportRangePicker.contains(event.target)) {
        return;
      }
      if (hoursReportPickerToggle && hoursReportPickerToggle.contains(event.target as Node)) {
        return;
      }
    }
    closeRangePicker();
  });

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      closeUserMenu();
      closeRangePicker();
      clearDiscordSession();
      renderAuthState();
      showToast("Signed out.", "info");
      switchView("home");
    });
  }

  if (clockInButton) {
    clockInButton.addEventListener("click", () => {
      void performClockIn();
    });
  }

  if (clockOutButton) {
    clockOutButton.addEventListener("click", () => {
      promptClockOut();
    });
  }

  if (clockOutModalForm) {
    clockOutModalForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!state.user) {
        showToast("Sign in before clocking out.", "info");
        closeClockOutModal();
        return;
      }
      try {
        ensureGuildConfigured();
      } catch (error) {
        closeClockOutModal();
        return;
      }
      if (!hasActiveSession()) {
        showToast("No active shift to clock out from.", "info");
        closeClockOutModal();
        return;
      }
      const summary = clockSummaryInput ? clockSummaryInput.value.trim() : "";
      if (!summary) {
        showToast("Add a summary before clocking out.", "info");
        if (clockSummaryInput) {
          clockSummaryInput.focus();
        }
        return;
      }
      try {
        await apiRequest({
          path: "shifts/end",
          method: "POST",
          body: {
            guild_id: state.guildId,
            user_id: state.user.id,
            summary,
            source: "web_app",
          },
        });
        showToast("Clocked out.", "success");
        if (clockSummaryInput) {
          clockSummaryInput.value = "";
        }
        closeClockOutModal();
        await refreshMyTime();
      } catch (error) {
        // handled globally
      }
    });
  }

  if (clockOutModalDismissButtons.length) {
    clockOutModalDismissButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeClockOutModal();
      });
    });
  }

  if (refreshMyTimeButton) {
    refreshMyTimeButton.addEventListener("click", () => {
      void refreshMyTime();
    });
  }

  if (holidayForm) {
    holidayForm.addEventListener("submit", (event) => {
      event.preventDefault();
      showToast("Holiday requests are handled inside Discord.", "info");
    });
  }

  if (refreshHolidaysButton) {
    refreshHolidaysButton.addEventListener("click", () => {
      refreshHolidays();
    });
  }

  if (adminTimesheetForm) {
    adminTimesheetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      const formData = new FormData(adminTimesheetForm);
      const memberId = String(formData.get("memberId") ?? "").trim();
      if (!memberId) {
        state.adminTimesheetMemberId = null;
        state.adminTimesheets = [];
        state.adminTimesheetWorker = null;
        loadAdminTimesheets();
        showToast("Enter a Discord ID to load a timesheet.", "info");
        return;
      }
      await loadAdminTimesheets(memberId);
    });
  }

  if (refreshAdminTimesheets) {
    refreshAdminTimesheets.addEventListener("click", async () => {
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      await loadAdminTimesheets();
    });
  }

  if (adminModifyHoursForm) {
    adminModifyHoursForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      try {
        ensureGuildConfigured();
      } catch (error) {
        return;
      }
      const formData = new FormData(adminModifyHoursForm);
      const memberId = String(formData.get("memberId") ?? "").trim();
      const hours = Number(formData.get("hours"));
      const scope = String(formData.get("scope") ?? "").toLowerCase();
      const action = String(formData.get("action") ?? "add").toLowerCase();

      if (!memberId) {
        showToast("Provide a member ID.", "error");
        return;
      }

      if (!Number.isFinite(hours) || hours <= 0) {
        showToast("Enter a positive number of hours.", "error");
        return;
      }

      if (!["daily", "weekly", "total"].includes(scope)) {
        showToast("Select a valid scope.", "error");
        return;
      }

      const endpoint = action === "remove" ? "workers/hours/remove" : "workers/hours/add";
      const payload = {
        guild_id: state.guildId,
        user_id: memberId,
        hours,
        scope,
      };
      try {
        await apiRequest({ path: endpoint, method: "POST", body: payload });
        showToast("Hours updated.", "success");
        adminModifyHoursForm.reset();
        if (state.adminTimesheetMemberId === memberId) {
          await loadAdminTimesheets();
        }
        if (state.user && state.user.id === memberId) {
          await refreshMyTime();
        }
      } catch (error) {
        // handled globally
      }
    });
  }

  if (refreshAdminHolidays) {
    refreshAdminHolidays.addEventListener("click", () => {
      loadAdminHolidays();
    });
  }

  if (adminHolidayForm) {
    adminHolidayForm.addEventListener("submit", (event) => {
      event.preventDefault();
      showToast("Handle holiday approvals from the Discord bot.", "info");
    });
  }

  if (adminRoleForm) {
    adminRoleForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }
      const formData = new FormData(adminRoleForm);
      try {
        ensureGuildConfigured();
      } catch (error) {
        return;
      }
      const memberId = String(formData.get("memberId") ?? "").trim();
      const roleId = String(formData.get("roleId") ?? "").trim();
      const experience = String(formData.get("experience") ?? "").trim();

      if (!memberId || !roleId) {
        showToast("Provide both a member ID and role ID.", "error");
        return;
      }

      const payload = {
        guild_id: state.guildId,
        user_id: memberId,
        role_id: roleId,
        experience: experience || undefined,
      };
      try {
        await apiRequest({
          path: "workers/change-role",
          method: "POST",
          body: payload,
        });
        showToast("Role updated.", "success");
        adminRoleForm.reset();
        if (state.adminTimesheetMemberId === memberId) {
          await loadAdminTimesheets();
        }
        if (state.user && state.user.id === memberId) {
          await refreshMyTime();
        }
      } catch (error) {
        // handled globally
      }
    });
  }

  if (timeClockActionButton) {
    timeClockActionButton.addEventListener("click", () => {
      if (timeClockActionButton.disabled) return;
      const action = timeClockActionButton.dataset.action;
      if (action === "login") {
        initiateLogin();
      } else if (action === "clock-in") {
        void performClockIn();
      } else if (action === "clock-out") {
        promptClockOut();
      }
    });
  }

  const applyHoursReportRange = (startTime: number, endTime: number): boolean => {
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      return false;
    }

    if (endTime <= startTime) {
      endTime = startTime + DAY_IN_MS;
    }

    const month = new Date(startTime);
    month.setHours(0, 0, 0, 0);
    month.setDate(1);
    const monthTime = month.getTime();

    const rangeChanged =
      state.hoursReportRangeStart !== startTime || state.hoursReportRangeEnd !== endTime;
    const monthChanged = state.hoursReportCalendarMonth !== monthTime;
    const followChanged = !state.hoursReportCalendarFollowSelection;

    state.hoursReportRangeStart = startTime;
    state.hoursReportRangeEnd = endTime;

    if (monthChanged) {
      state.hoursReportCalendarMonth = monthTime;
    }

    if (followChanged) {
      state.hoursReportCalendarFollowSelection = true;
    }

    if (rangeChanged || monthChanged || followChanged) {
      renderHoursReport();
      return true;
    }

    return false;
  };

  const shiftCalendarMonth = (direction: 1 | -1) => {
    const base =
      typeof state.hoursReportCalendarMonth === "number"
        ? new Date(state.hoursReportCalendarMonth)
        : new Date(state.hoursReportRangeStart);
    if (Number.isNaN(base.getTime())) return;
    base.setHours(0, 0, 0, 0);
    base.setDate(1);
    base.setMonth(base.getMonth() + direction);
    const newTime = base.getTime();
    if (state.hoursReportCalendarMonth === newTime) return;
    state.hoursReportCalendarFollowSelection = false;
    state.hoursReportCalendarMonth = newTime;
    renderHoursReport();
    focusCalendarDay();
  };

  const handleCalendarMonthYearChange = () => {
    if (!hoursReportMonthSelect || !hoursReportYearSelect) return;
    const month = Number(hoursReportMonthSelect.value);
    const year = Number(hoursReportYearSelect.value);
    if (!Number.isInteger(month) || !Number.isInteger(year)) {
      return;
    }
    const base =
      typeof state.hoursReportCalendarMonth === "number"
        ? new Date(state.hoursReportCalendarMonth)
        : typeof state.hoursReportRangeStart === "number"
          ? new Date(state.hoursReportRangeStart)
          : new Date();
    if (Number.isNaN(base.getTime())) {
      base.setTime(Date.now());
    }
    base.setHours(0, 0, 0, 0);
    base.setDate(1);
    base.setFullYear(year);
    base.setMonth(month);
    const newTime = base.getTime();
    if (state.hoursReportCalendarMonth === newTime) {
      return;
    }
    state.hoursReportCalendarFollowSelection = false;
    state.hoursReportCalendarMonth = newTime;
    renderHoursReport();
    focusCalendarDay();
  };

  if (hoursReportMonthSelect) {
    hoursReportMonthSelect.addEventListener("change", handleCalendarMonthYearChange);
  }

  if (hoursReportYearSelect) {
    hoursReportYearSelect.addEventListener("change", handleCalendarMonthYearChange);
  }

  if (hoursReportThisWeekButton) {
    hoursReportThisWeekButton.addEventListener("click", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const changed = applyHoursReportRange(start.getTime(), end.getTime());
      if (changed) {
        focusCalendarDay();
      }
      closeRangePicker();
    });
  }

  if (hoursReportThisMonthButton) {
    hoursReportThisMonthButton.addEventListener("click", () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(today);
      start.setDate(1);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      const changed = applyHoursReportRange(start.getTime(), end.getTime());
      if (changed) {
        focusCalendarDay();
      }
      closeRangePicker();
    });
  }

  if (hoursReportCalendarGrid) {
    let isDraggingRange = false;
    let selectionAnchor: number | null = null;

    const updateRange = (anchorTime: number, targetTime: number) => {
      const startTime = Math.min(anchorTime, targetTime);
      const endTime = Math.max(anchorTime, targetTime) + DAY_IN_MS;
      applyHoursReportRange(startTime, endTime);
    };

    const resolveDateFromPointer = (event: PointerEvent): number | null => {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      if (!element) return null;
      const button = element.closest<HTMLButtonElement>("[data-calendar-date]");
      if (!button || !hoursReportCalendarGrid.contains(button)) return null;
      const value = Number(button.dataset.calendarDate);
      return Number.isFinite(value) ? value : null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingRange || selectionAnchor === null) return;
      const targetValue = resolveDateFromPointer(event);
      if (targetValue === null) return;
      updateRange(selectionAnchor, targetValue);
    };

    function stopDragging(event?: PointerEvent): void {
      if (!isDraggingRange) return;
      if (event && selectionAnchor !== null) {
        const targetValue = resolveDateFromPointer(event);
        if (targetValue !== null) {
          updateRange(selectionAnchor, targetValue);
        }
      }
      isDraggingRange = false;
      selectionAnchor = null;
      removePointerListeners();
      focusCalendarDay();
    }

    function cancelDragging(): void {
      if (!isDraggingRange) return;
      isDraggingRange = false;
      selectionAnchor = null;
      removePointerListeners();
    }

    function removePointerListeners(): void {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", stopDragging);
      document.removeEventListener("pointercancel", cancelDragging);
    }

    hoursReportCalendarGrid.addEventListener("pointerdown", (event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
        "[data-calendar-date]"
      );
      if (!target) return;
      event.preventDefault();
      const value = Number(target.dataset.calendarDate);
      if (!Number.isFinite(value)) return;
      const anchor =
        event.shiftKey && typeof state.hoursReportRangeStart === "number"
          ? state.hoursReportRangeStart
          : value;
      selectionAnchor = anchor;
      isDraggingRange = true;
      updateRange(anchor, value);
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", stopDragging);
      document.addEventListener("pointercancel", cancelDragging);
    });

    hoursReportCalendarGrid.addEventListener(
      "wheel",
      (event) => {
        if (event.ctrlKey) return;
        const primaryDelta =
          Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
        if (primaryDelta === 0) return;
        event.preventDefault();
        const direction: 1 | -1 = primaryDelta > 0 ? 1 : -1;
        shiftCalendarMonth(direction);
      },
      { passive: false }
    );
  }

  if (hoursReportExportButton) {
    hoursReportExportButton.addEventListener("click", () => {
      if (!state.user) {
        showToast("Sign in to export your hours.", "info");
        return;
      }
      showToast("CSV export coming soon. Use the admin dashboard for full exports.", "info");
    });
  }
}
