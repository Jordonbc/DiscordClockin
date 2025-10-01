import {
  confirmDialog,
  confirmDialogTitle,
  confirmDialogMessage,
  confirmDialogDetails,
  confirmDialogWarning,
  confirmDialogConfirmButton,
  confirmDialogCancelButton,
  confirmDialogDismissElements,
} from "../dom";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ConfirmDialogTone = "default" | "danger";

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  details?: string[];
  emphasizeWarning?: boolean;
}

let isOpen = false;
let resolveFn: ((confirmed: boolean) => void) | null = null;
let previouslyFocused: HTMLElement | null = null;
let focusableElements: HTMLElement[] = [];

function isDialogAvailable(): boolean {
  return Boolean(
    confirmDialog &&
      confirmDialogTitle &&
      confirmDialogMessage &&
      confirmDialogConfirmButton &&
      confirmDialogCancelButton,
  );
}

function updateFocusableElements(): void {
  if (!confirmDialog) {
    focusableElements = [];
    return;
  }

  focusableElements = Array.from(
    confirmDialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => !element.hasAttribute("disabled") && !element.hidden);
}

function restoreFocus(): void {
  if (previouslyFocused) {
    previouslyFocused.focus();
  }
  previouslyFocused = null;
}

function hideDialog(): void {
  if (!confirmDialog) return;
  confirmDialog.hidden = true;
  confirmDialog.setAttribute("aria-hidden", "true");
  if (document.body) {
    document.body.classList.remove("modal-open");
  }
  if (confirmDialogDetails) {
    confirmDialogDetails.innerHTML = "";
    confirmDialogDetails.hidden = true;
  }
  if (confirmDialogWarning) {
    confirmDialogWarning.hidden = true;
  }
  restoreFocus();
}

function settleDialog(result: boolean): void {
  if (!isOpen) return;
  isOpen = false;
  hideDialog();
  const resolver = resolveFn;
  resolveFn = null;
  if (resolver) {
    resolver(result);
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (!isOpen || !confirmDialog) return;

  if (event.key === "Escape") {
    event.preventDefault();
    settleDialog(false);
    return;
  }

  if (event.key === "Tab") {
    if (!focusableElements.length) {
      updateFocusableElements();
    }
    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (!activeElement || activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else if (!activeElement || activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

document.addEventListener("keydown", handleKeydown);

function setConfirmButtonTone(tone: ConfirmDialogTone): void {
  if (!confirmDialogConfirmButton) return;
  confirmDialogConfirmButton.classList.remove("button--primary", "button--danger");
  if (tone === "danger") {
    confirmDialogConfirmButton.classList.add("button--danger");
  } else {
    confirmDialogConfirmButton.classList.add("button--primary");
  }
}

function configureDialog(options: ConfirmDialogOptions): void {
  if (confirmDialogTitle) {
    confirmDialogTitle.textContent = options.title;
  }
  if (confirmDialogMessage) {
    confirmDialogMessage.textContent = options.message;
  }
  if (confirmDialogConfirmButton) {
    confirmDialogConfirmButton.textContent = options.confirmLabel || "Confirm";
  }
  if (confirmDialogCancelButton) {
    confirmDialogCancelButton.textContent = options.cancelLabel || "Cancel";
  }

  const tone = options.tone === "danger" ? "danger" : "default";
  setConfirmButtonTone(tone);

  if (confirmDialogDetails) {
    confirmDialogDetails.innerHTML = "";
    if (options.details && options.details.length) {
      options.details.forEach((item) => {
        const entry = document.createElement("li");
        entry.textContent = item;
        confirmDialogDetails.append(entry);
      });
      confirmDialogDetails.hidden = false;
    } else {
      confirmDialogDetails.hidden = true;
    }
  }

  if (confirmDialogWarning) {
    confirmDialogWarning.hidden = !options.emphasizeWarning;
  }
}

function showDialog(): void {
  if (!confirmDialog) return;
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  confirmDialog.hidden = false;
  confirmDialog.removeAttribute("aria-hidden");
  if (document.body) {
    document.body.classList.add("modal-open");
  }
  updateFocusableElements();
  const target = confirmDialogConfirmButton || focusableElements[0] || null;
  if (target) {
    requestAnimationFrame(() => {
      target.focus();
    });
  }
}

export function openConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  if (!isDialogAvailable()) {
    const fallback = window.confirm(options.message);
    return Promise.resolve(fallback);
  }

  if (isOpen) {
    settleDialog(false);
  }

  configureDialog(options);
  showDialog();
  updateFocusableElements();
  isOpen = true;

  return new Promise<boolean>((resolve) => {
    resolveFn = resolve;
  });
}

if (confirmDialogDismissElements.length) {
  confirmDialogDismissElements.forEach((element) => {
    element.addEventListener("click", () => {
      settleDialog(false);
    });
  });
}

if (confirmDialogConfirmButton) {
  confirmDialogConfirmButton.addEventListener("click", () => {
    settleDialog(true);
  });
}

if (confirmDialogCancelButton) {
  confirmDialogCancelButton.addEventListener("click", () => {
    settleDialog(false);
  });
}

export function closeConfirmDialog(): void {
  settleDialog(false);
}
