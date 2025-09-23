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
  holidayForm,
  hoursReportExportButton,
  hoursReportRangeButtons,
  loginButton,
  logoutButton,
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
    }
  });

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      closeUserMenu();
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

  hoursReportRangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const { reportRange } = button.dataset;
      if (!reportRange || state.hoursReportRange === reportRange) return;
      state.hoursReportRange = reportRange;
      renderHoursReport();
    });
  });

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
