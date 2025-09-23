import { navButtons, viewJumpButtons, views } from "./dom.js";
import { showToast } from "./ui/notifications.js";
import { state } from "./state.js";
import { canAccessAdmin } from "./permissions.js";

export function switchView(target: string): void {
  views.forEach((view) => {
    const shouldDisplay = view.dataset.view === target;
    view.classList.toggle("view--active", shouldDisplay);
  });

  navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewButton === target);
  });

  window.dispatchEvent(new CustomEvent("clockin:view-changed", { detail: target }));
}

export function bindNavigation(): void {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      switchView(button.dataset.viewButton || "home");
    });
  });

  viewJumpButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.viewJump;
      if (!target) return;

      if (target !== "home" && !state.user) {
        showToast("Sign in to access this section.", "info");
        return;
      }

      const requiresRole = button.dataset.requiresRole;
      if (requiresRole === "admin" && !canAccessAdmin()) {
        showToast("Admin access required.", "error");
        return;
      }

      switchView(target);
    });
  });
}
