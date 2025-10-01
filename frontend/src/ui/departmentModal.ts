import {
  departmentModal,
  departmentModalForm,
  departmentModalTitle,
  departmentModalDescription,
  departmentModalError,
  departmentNameInput,
  departmentSubmitButton,
  departmentModalDismissElements,
} from "../dom";
import { state } from "../state";
import {
  createDepartment,
  updateDepartment,
  refreshAdminOverview,
} from "../adminData";
import { showToast } from "./notifications";
import type { AdminDepartmentSummary } from "../types";

type DepartmentModalMode = "create" | "edit";

let mode: DepartmentModalMode = "create";
let activeDepartmentId: string | null = null;
let isSubmitting = false;
let submitIdleLabel = "Create department";
let submitBusyLabel = "Creating…";

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    closeDepartmentModal();
  }
}

function getDepartmentById(departmentId: string): AdminDepartmentSummary | undefined {
  const overview = state.adminOverview;
  if (!overview) return undefined;
  return overview.departments.find((entry) =>
    entry.id.toLowerCase() === departmentId.toLowerCase(),
  );
}

function clearForm(): void {
  if (departmentModalForm) {
    departmentModalForm.reset();
  }
  if (departmentModalError) {
    departmentModalError.hidden = true;
    departmentModalError.textContent = "";
  }
  if (departmentNameInput) {
    departmentNameInput.value = "";
    departmentNameInput.disabled = false;
  }
  if (departmentSubmitButton) {
    departmentSubmitButton.disabled = false;
    departmentSubmitButton.textContent = submitIdleLabel;
  }
  isSubmitting = false;
  activeDepartmentId = null;
}

function setSubmitting(submitting: boolean): void {
  isSubmitting = submitting;
  if (departmentNameInput) {
    departmentNameInput.disabled = submitting;
  }
  if (departmentSubmitButton) {
    departmentSubmitButton.disabled = submitting;
    departmentSubmitButton.textContent = submitting ? submitBusyLabel : submitIdleLabel;
  }
}

function showFormError(message: string): void {
  if (!departmentModalError) return;
  departmentModalError.textContent = message;
  departmentModalError.hidden = !message;
}

function clearFormError(): void {
  if (!departmentModalError) return;
  departmentModalError.hidden = true;
  departmentModalError.textContent = "";
}

function focusInput(): void {
  if (!departmentNameInput) return;
  requestAnimationFrame(() => {
    departmentNameInput.focus();
    departmentNameInput.select();
  });
}

function resolveErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const data = error as Record<string, unknown>;
    if (typeof data.message === "string") return data.message;
    if (typeof data.data === "string") return data.data;
    if (data.data && typeof data.data === "object" && typeof (data.data as any).message === "string") {
      return (data.data as any).message;
    }
  }
  return "";
}

function normalizeName(input: string): string {
  return input.trim();
}

export function openDepartmentModal(options: { mode: "create" } | { mode: "edit"; departmentId: string }): void {
  if (!departmentModal || !departmentModalForm || !departmentNameInput || !departmentSubmitButton) {
    return;
  }

  if (options.mode === "edit") {
    const department = getDepartmentById(options.departmentId);
    if (!department) {
      showToast("Department not found.", "error");
      return;
    }
    mode = "edit";
    activeDepartmentId = department.id;
    submitIdleLabel = "Save changes";
    submitBusyLabel = "Saving…";
    if (departmentModalTitle) {
      departmentModalTitle.textContent = "Edit department";
    }
    if (departmentModalDescription) {
      departmentModalDescription.textContent =
        "Update the department name. Changes apply to all linked roles.";
    }
    departmentNameInput.value = department.name;
  } else {
    mode = "create";
    activeDepartmentId = null;
    submitIdleLabel = "Create department";
    submitBusyLabel = "Creating…";
    if (departmentModalTitle) {
      departmentModalTitle.textContent = "Add department";
    }
    if (departmentModalDescription) {
      departmentModalDescription.textContent =
        "Create a new department to organize related roles and reporting lines.";
    }
    departmentNameInput.value = "";
  }

  departmentSubmitButton.textContent = submitIdleLabel;
  clearFormError();
  setSubmitting(false);

  departmentModal.hidden = false;
  if (document.body) {
    document.body.classList.add("modal-open");
  }
  document.addEventListener("keydown", handleKeydown);
  focusInput();
}

export function closeDepartmentModal(): void {
  if (!departmentModal || departmentModal.hidden) return;
  departmentModal.hidden = true;
  if (document.body) {
    document.body.classList.remove("modal-open");
  }
  document.removeEventListener("keydown", handleKeydown);
  clearForm();
}

if (departmentModalForm) {
  departmentModalForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting || !departmentNameInput) return;

    const name = normalizeName(departmentNameInput.value);
    if (!name) {
      showFormError("Department name is required.");
      focusInput();
      return;
    }

    clearFormError();
    setSubmitting(true);

    try {
      if (mode === "create") {
        await createDepartment({ name });
        showToast(`Department "${name}" created.`, "success");
      } else if (activeDepartmentId) {
        await updateDepartment(activeDepartmentId, { name });
        showToast("Department updated.", "success");
      } else {
        throw new Error("Missing department context.");
      }
      closeDepartmentModal();
      await refreshAdminOverview();
    } catch (error) {
      const message = resolveErrorMessage(error) || "Unable to save department.";
      showFormError(message);
    } finally {
      setSubmitting(false);
    }
  });
}

if (departmentModalDismissElements.length) {
  departmentModalDismissElements.forEach((element) => {
    element.addEventListener("click", () => {
      if (isSubmitting) return;
      closeDepartmentModal();
    });
  });
}
