import {
  roleModal,
  roleModalForm,
  roleModalTitle,
  roleModalDescription,
  roleModalError,
  roleNameInput,
  roleCategoryInput,
  roleCategoryOptions,
  roleExperienceOptions,
  roleSubmitButton,
  roleModalDismissElements,
} from "../dom";
import { state } from "../state";
import { createRole, loadRolesConfiguration, updateRole } from "../rolesData";
import { refreshAdminOverview } from "../adminData";
import { showToast } from "./notifications";
import type { GuildRoleDefinition, RoleFormPayload } from "../types";

const EXPERIENCE_CHECKBOX_SELECTOR = "[data-role-experience-checkbox]";
const EXPERIENCE_RATE_SELECTOR = "[data-role-experience-rate]";

type RoleModalMode = "create" | "edit";

let mode: RoleModalMode = "create";
let activeRoleId: string | null = null;
let isSubmitting = false;
let submitIdleLabel = "Create role";
let submitBusyLabel = "Creating…";

function hasConfiguredExperiences(): boolean {
  const experiences = state.rolesConfiguration?.experiences || [];
  return experiences.length > 0;
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    closeRoleModal();
  }
}

function getRoleById(roleId: string): GuildRoleDefinition | undefined {
  const config = state.rolesConfiguration;
  if (!config) return undefined;
  return config.roles.find((entry) => entry.id.toLowerCase() === roleId.toLowerCase());
}

function populateCategoryOptions(): void {
  if (!roleCategoryOptions) return;
  roleCategoryOptions.innerHTML = "";
  const categories = state.rolesConfiguration?.categories || [];
  const uniqueCategories = Array.from(
    new Set(categories.map((category) => category.trim()).filter((category) => category.length > 0)),
  ).sort((a, b) => a.localeCompare(b));
  uniqueCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    roleCategoryOptions.append(option);
  });
}

function resolveRateValue(rateMap: Record<string, number>, experience: string): number | undefined {
  if (experience in rateMap) {
    return rateMap[experience];
  }
  const normalized = experience.trim();
  if (normalized in rateMap) {
    return rateMap[normalized];
  }
  const lower = normalized.toLowerCase();
  const rateEntry = Object.entries(rateMap).find(([key]) => key.toLowerCase() === lower);
  return rateEntry ? rateEntry[1] : undefined;
}

function syncRateInputsWithCheckboxes(): void {
  if (!roleExperienceOptions) return;
  const checkboxes = roleExperienceOptions.querySelectorAll<HTMLInputElement>(EXPERIENCE_CHECKBOX_SELECTOR);
  checkboxes.forEach((checkbox) => {
    const option = checkbox.closest<HTMLElement>(".role-modal__option");
    const rateInput = option?.querySelector<HTMLInputElement>(EXPERIENCE_RATE_SELECTOR) || null;
    if (!option || !rateInput) return;
    const shouldEnable = checkbox.checked && !isSubmitting;
    rateInput.disabled = !shouldEnable;
    option.classList.toggle("is-disabled", !checkbox.checked);
    if (!checkbox.checked && !isSubmitting) {
      rateInput.value = "";
    }
  });
}

function populateExperienceOptions(selected: Set<string>, rateMap: Record<string, number>): void {
  if (!roleExperienceOptions) return;
  roleExperienceOptions.innerHTML = "";

  const config = state.rolesConfiguration;
  const experiences = config?.experiences || [];

  if (!experiences.length) {
    const message = document.createElement("p");
    message.className = "role-modal__empty";
    message.textContent = "Configure experiences in the Discord bot before creating roles.";
    roleExperienceOptions.append(message);
    return;
  }

  experiences.forEach((experience, index) => {
    const option = document.createElement("div");
    option.className = "role-modal__option";
    option.dataset.experience = experience;

    const header = document.createElement("div");
    header.className = "role-modal__option-header";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `role-experience-${index}`;
    checkbox.value = experience;
    checkbox.dataset.roleExperienceCheckbox = "true";

    const label = document.createElement("label");
    label.className = "role-modal__option-label";
    label.setAttribute("for", checkbox.id);
    label.textContent = experience;

    header.append(checkbox, label);

    const rateWrapper = document.createElement("div");
    rateWrapper.className = "role-modal__rate";

    const rateLabel = document.createElement("label");
    rateLabel.textContent = "Hourly rate";

    const rateInput = document.createElement("input");
    rateInput.type = "number";
    rateInput.min = "0";
    rateInput.step = "0.01";
    rateInput.placeholder = "0.00";
    rateInput.inputMode = "decimal";
    rateInput.dataset.roleExperienceRate = "true";
    rateInput.dataset.experience = experience;

    const preset = resolveRateValue(rateMap, experience);
    if (typeof preset === "number" && Number.isFinite(preset)) {
      rateInput.value = preset.toFixed(2);
      checkbox.checked = true;
    } else if (selected.has(experience) || selected.has(experience.trim())) {
      checkbox.checked = true;
    }

    rateLabel.append(rateInput);
    rateWrapper.append(rateLabel);
    option.append(header, rateWrapper);

    checkbox.addEventListener("change", () => {
      syncRateInputsWithCheckboxes();
      if (checkbox.checked && !rateInput.value) {
        rateInput.focus();
      }
    });

    roleExperienceOptions.append(option);
  });

  syncRateInputsWithCheckboxes();
}

function clearForm(): void {
  if (roleModalForm) {
    roleModalForm.reset();
  }
  if (roleModalError) {
    roleModalError.hidden = true;
    roleModalError.textContent = "";
  }
  if (roleExperienceOptions) {
    roleExperienceOptions.innerHTML = "";
  }
  if (roleSubmitButton) {
    roleSubmitButton.textContent = submitIdleLabel;
    roleSubmitButton.disabled = !hasConfiguredExperiences();
  }
  activeRoleId = null;
  isSubmitting = false;
}

function setSubmitting(submitting: boolean): void {
  isSubmitting = submitting;
  if (roleNameInput) {
    roleNameInput.disabled = submitting;
  }
  if (roleCategoryInput) {
    roleCategoryInput.disabled = submitting;
  }
  if (roleExperienceOptions) {
    const checkboxes = roleExperienceOptions.querySelectorAll<HTMLInputElement>(EXPERIENCE_CHECKBOX_SELECTOR);
    checkboxes.forEach((checkbox) => {
      checkbox.disabled = submitting;
    });
  }
  syncRateInputsWithCheckboxes();
  if (roleSubmitButton) {
    roleSubmitButton.disabled = submitting || !hasConfiguredExperiences();
    roleSubmitButton.textContent = submitting ? submitBusyLabel : submitIdleLabel;
  }
}

function showFormError(message: string): void {
  if (!roleModalError) return;
  roleModalError.textContent = message;
  roleModalError.hidden = !message;
}

function clearFormError(): void {
  if (!roleModalError) return;
  roleModalError.hidden = true;
  roleModalError.textContent = "";
}

function focusRoleName(): void {
  if (!roleNameInput) return;
  requestAnimationFrame(() => {
    roleNameInput.focus();
    roleNameInput.select();
  });
}

interface FormResult {
  payload?: RoleFormPayload;
  error?: string;
  focusTarget?: HTMLElement | null;
}

function collectFormValues(): FormResult {
  if (!roleNameInput || !roleCategoryInput || !roleExperienceOptions) {
    return { error: "Form is not ready." };
  }

  const name = roleNameInput.value.trim();
  if (!name) {
    return { error: "Role name is required.", focusTarget: roleNameInput };
  }

  const category = roleCategoryInput.value.trim();
  if (!category) {
    return { error: "Category is required.", focusTarget: roleCategoryInput };
  }

  const checkboxes = Array.from(
    roleExperienceOptions.querySelectorAll<HTMLInputElement>(EXPERIENCE_CHECKBOX_SELECTOR),
  );

  if (!checkboxes.length) {
    return { error: "Configure experiences before creating roles." };
  }

  const experiences: string[] = [];
  const hourlySalary: Record<string, number> = {};

  for (const checkbox of checkboxes) {
    if (!checkbox.checked) {
      continue;
    }
    const experience = checkbox.value.trim();
    if (!experience) {
      continue;
    }
    const option = checkbox.closest<HTMLElement>(".role-modal__option");
    const rateInput = option?.querySelector<HTMLInputElement>(EXPERIENCE_RATE_SELECTOR) || null;
    if (!rateInput) {
      return { error: `Hourly rate required for ${experience}.`, focusTarget: checkbox };
    }
    const rawRate = rateInput.value.trim();
    if (!rawRate) {
      return { error: `Provide an hourly rate for ${experience}.`, focusTarget: rateInput };
    }
    const rate = Number(rawRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return { error: `Hourly rate for ${experience} must be greater than zero.`, focusTarget: rateInput };
    }
    experiences.push(experience);
    hourlySalary[experience] = rate;
  }

  if (!experiences.length) {
    return { error: "Select at least one experience tier." };
  }

  return {
    payload: {
      name,
      category,
      experiences,
      hourly_salary: hourlySalary,
    },
  };
}

function applyRoleToForm(role: GuildRoleDefinition | null): void {
  if (!roleNameInput || !roleCategoryInput) return;
  if (!role) {
    roleNameInput.value = "";
    roleCategoryInput.value = "";
    populateExperienceOptions(new Set<string>(), {});
    return;
  }

  roleNameInput.value = role.name;
  roleCategoryInput.value = role.category;
  const selected = new Set(role.experiences.map((entry) => entry.trim()));
  populateExperienceOptions(selected, role.hourly_salary);
}

export async function openRoleModal(
  options: { mode: "create" } | { mode: "edit"; roleId: string },
): Promise<void> {
  if (!roleModal || !roleModalForm || !roleNameInput || !roleCategoryInput || !roleSubmitButton) {
    showToast("Role modal is unavailable.", "error");
    return;
  }

  try {
    await loadRolesConfiguration();
  } catch (error) {
    const message =
      (error instanceof Error ? error.message : "Unable to load role configuration.") ||
      "Unable to load role configuration.";
    showToast(message, "error");
    return;
  }

  if (!state.rolesConfiguration) {
    showToast("Unable to load role configuration.", "error");
    return;
  }

  populateCategoryOptions();

  if (options.mode === "edit") {
    const role = options.roleId ? getRoleById(options.roleId) : undefined;
    if (!role) {
      showToast("Role not found.", "error");
      return;
    }
    mode = "edit";
    activeRoleId = role.id;
    submitIdleLabel = "Save changes";
    submitBusyLabel = "Saving…";
    if (roleModalTitle) {
      roleModalTitle.textContent = "Edit role";
    }
    if (roleModalDescription) {
      roleModalDescription.textContent = "Update compensation, experiences, or category for this role.";
    }
    applyRoleToForm(role);
  } else {
    mode = "create";
    activeRoleId = null;
    submitIdleLabel = "Create role";
    submitBusyLabel = "Creating…";
    if (roleModalTitle) {
      roleModalTitle.textContent = "Add role";
    }
    if (roleModalDescription) {
      roleModalDescription.textContent = "Create a new role with experience-based compensation.";
    }
    applyRoleToForm(null);
  }

  clearFormError();
  setSubmitting(false);

  if (!hasConfiguredExperiences()) {
    showFormError("Add experience tiers in the Discord bot before creating roles.");
  }

  roleModal.hidden = false;
  if (document.body) {
    document.body.classList.add("modal-open");
  }
  document.addEventListener("keydown", handleKeydown);
  focusRoleName();
}

export function closeRoleModal(): void {
  if (!roleModal || roleModal.hidden) return;
  roleModal.hidden = true;
  if (document.body) {
    document.body.classList.remove("modal-open");
  }
  document.removeEventListener("keydown", handleKeydown);
  clearForm();
}

if (roleModalForm) {
  roleModalForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const { payload, error, focusTarget } = collectFormValues();
    if (error || !payload) {
      if (error) {
        showFormError(error);
      }
      if (focusTarget) {
        requestAnimationFrame(() => {
          focusTarget.focus();
          if (focusTarget instanceof HTMLInputElement || focusTarget instanceof HTMLTextAreaElement) {
            focusTarget.select();
          }
        });
      }
      return;
    }

    clearFormError();
    setSubmitting(true);

    try {
      if (mode === "create") {
        await createRole(payload);
        showToast(`Role "${payload.name}" created.`, "success");
      } else if (activeRoleId) {
        await updateRole(activeRoleId, payload);
        showToast("Role updated.", "success");
      } else {
        throw new Error("Missing role context.");
      }
      closeRoleModal();
      await refreshAdminOverview();
    } catch (error) {
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
          ? error.message
          : "Unable to save role.";
      showFormError(message || "Unable to save role.");
    } finally {
      setSubmitting(false);
    }
  });
}

if (roleModalDismissElements.length) {
  roleModalDismissElements.forEach((element) => {
    element.addEventListener("click", () => {
      if (isSubmitting) return;
      closeRoleModal();
    });
  });
}
