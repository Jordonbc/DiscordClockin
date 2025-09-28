import {
  appShell,
  authRequiredModal,
  authRequiredLoginButton,
  heroLoginButton,
  loginButton,
  logoutButton,
  navButtons,
  userAvatar,
  userMenu,
  userMenuAdmin,
  userMenuButton,
  userName,
  userRoles,
  viewJumpButtons,
} from "./dom";
import { state } from "./state";
import { closeUserMenu } from "./ui/clockControls";
import { updateClockStatus } from "./clockStatusManager";
import { renderDashboardOverview, renderHoursReport } from "./ui/dashboard";
import { renderProfileView } from "./ui/profile";
import { updateClockControlsVisibility } from "./ui/clockControls";
import { switchView } from "./navigation";
import { canAccessAdmin } from "./permissions";

export function renderAuthState(): void {
  const authed = Boolean(state.user);

  if (authRequiredModal) {
    const previouslyHidden = authRequiredModal.hidden;
    authRequiredModal.hidden = authed;
    if (document.body) {
      document.body.classList.toggle("auth-modal-open", !authed);
    }
    if (!authed && previouslyHidden && authRequiredLoginButton) {
      authRequiredLoginButton.focus();
    }
  }

  if (appShell) {
    appShell.classList.toggle("app--auth-locked", !authed);
    if (!authed) {
      appShell.setAttribute("aria-hidden", "true");
      appShell.setAttribute("inert", "");
    } else {
      appShell.removeAttribute("aria-hidden");
      appShell.removeAttribute("inert");
    }
  }

  if (loginButton) loginButton.hidden = authed;
  if (heroLoginButton) heroLoginButton.hidden = authed;

  if (userMenu) {
    userMenu.hidden = !authed;
    if (!authed) {
      closeUserMenu();
    }
  }

  if (logoutButton) {
    logoutButton.hidden = !authed;
  }

  if (userMenuAdmin) {
    userMenuAdmin.hidden = !(authed && canAccessAdmin());
  }

  if (authed) {
    userName.textContent =
      state.user.displayName || state.user.username || "User";
    const roleDetails: string[] = [];
    if (state.workerProfile && state.workerProfile.role_id) {
      roleDetails.push(`Role ID: ${state.workerProfile.role_id}`);
    }
    if (Array.isArray(state.user.roles) && state.user.roles.includes("admin")) {
      roleDetails.push("Admin");
    }
    userRoles.textContent = roleDetails.length
      ? roleDetails.join(" • ")
      : "No role assigned";

    if (state.user.avatarUrl) {
      userAvatar.src = state.user.avatarUrl;
      userAvatar.alt = `${state.user.displayName || "User"} avatar`;
    } else {
      userAvatar.removeAttribute("src");
      userAvatar.alt = "";
    }

    if (userMenuButton) {
      const label = state.user.displayName || state.user.username || "Profile";
      userMenuButton.setAttribute("aria-label", label);
      userMenuButton.setAttribute("title", label);
    }
  } else {
    userName.textContent = "";
    userRoles.textContent = "";
    if (userAvatar) {
      userAvatar.removeAttribute("src");
    }
  }

  updateClockControlsVisibility();

  navButtons.forEach((button) => {
    const requiresAuth = button.dataset.requiresAuth === "true";
    const requiresRole = button.dataset.requiresRole;
    let visible = true;

    if (requiresAuth) {
      visible = authed;
    }

    if (requiresRole) {
      visible = visible && requiresRole === "admin" ? canAccessAdmin() : visible;
    }

    button.hidden = !visible;
  });

  viewJumpButtons.forEach((button) => {
    const requiresAuth = button.dataset.requiresAuth === "true";
    const requiresRole = button.dataset.requiresRole;
    let visible = true;

    if (requiresAuth) {
      visible = authed;
    }

    if (requiresRole) {
      visible = visible && requiresRole === "admin" ? canAccessAdmin() : visible;
    }

    button.hidden = !visible;
  });

  renderHoursReport();
  renderProfileView();

  const activeButton = navButtons.find((button) =>
    button.classList.contains("is-active"),
  );
  if (activeButton && activeButton.hidden) {
    switchView("home");
  }

  updateClockStatus();
  renderDashboardOverview();
}
