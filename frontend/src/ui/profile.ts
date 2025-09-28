import type { ProfileFormValues } from "../profileData";
import { saveProfile } from "../profileData";
import {
  profileBioInput,
  profileEmptyState,
  profileFirstNameInput,
  profileForm,
  profileLastNameInput,
  profileLocationInput,
  profilePronounsInput,
  profileResetButton,
  profileStatus,
  profileSubmitButton,
  profileTimezoneInput,
} from "../dom";
import { state } from "../state";
import type { WorkerProfile } from "../types";

let initialValues: ProfileFormValues = {
  first_name: "",
  last_name: "",
  pronouns: "",
  timezone: "",
  location: "",
  bio: "",
};

function extractWorkerValues(worker: WorkerProfile | null): ProfileFormValues {
  return {
    first_name: worker?.first_name ? String(worker.first_name) : "",
    last_name: worker?.last_name ? String(worker.last_name) : "",
    pronouns: worker?.pronouns ? String(worker.pronouns) : "",
    timezone: worker?.timezone ? String(worker.timezone) : "",
    location: worker?.location ? String(worker.location) : "",
    bio: worker?.bio ? String(worker.bio) : "",
  };
}

function applyValues(values: ProfileFormValues): void {
  if (profileFirstNameInput) profileFirstNameInput.value = values.first_name;
  if (profileLastNameInput) profileLastNameInput.value = values.last_name;
  if (profilePronounsInput) profilePronounsInput.value = values.pronouns;
  if (profileTimezoneInput) profileTimezoneInput.value = values.timezone;
  if (profileLocationInput) profileLocationInput.value = values.location;
  if (profileBioInput) profileBioInput.value = values.bio;
}

function collectValues(): ProfileFormValues {
  return {
    first_name: profileFirstNameInput?.value || "",
    last_name: profileLastNameInput?.value || "",
    pronouns: profilePronounsInput?.value || "",
    timezone: profileTimezoneInput?.value || "",
    location: profileLocationInput?.value || "",
    bio: profileBioInput?.value || "",
  };
}

function setDirty(isDirty: boolean): void {
  if (!profileForm) return;
  profileForm.dataset.dirty = isDirty ? "true" : "false";
  renderProfileView();
}

function setInputsDisabled(disabled: boolean): void {
  const inputs = [
    profileFirstNameInput,
    profileLastNameInput,
    profilePronounsInput,
    profileTimezoneInput,
    profileLocationInput,
    profileBioInput,
  ];
  inputs.forEach((input) => {
    if (input) {
      input.disabled = disabled;
    }
  });
}

export function initializeProfileView(): void {
  if (!profileForm) {
    return;
  }

  profileForm.dataset.dirty = "false";

  profileForm.addEventListener("input", () => {
    setDirty(true);
  });

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.profileSaving || state.profileLoading) {
      return;
    }
    void saveProfile(collectValues());
  });

  profileForm.addEventListener("reset", (event) => {
    event.preventDefault();
    applyValues(initialValues);
    setDirty(false);
  });

  window.addEventListener("clockin:profile-updated", () => {
    setDirty(false);
  });
}

export function renderProfileView(): void {
  if (!profileForm || !profileStatus) {
    return;
  }

  const authed = Boolean(state.user);
  const worker = state.workerProfile as WorkerProfile | null;
  const hasWorker = Boolean(worker);
  const loading = state.profileLoading;
  const saving = state.profileSaving;

  profileForm.hidden = !hasWorker;

  if (profileEmptyState) {
    profileEmptyState.hidden = !authed || hasWorker;
  }

  setInputsDisabled(!authed || !hasWorker || loading || saving);

  const dirty = profileForm.dataset.dirty === "true";

  if (profileSubmitButton) {
    profileSubmitButton.disabled = !authed || !hasWorker || loading || saving || !dirty;
  }

  if (profileResetButton) {
    profileResetButton.disabled = !authed || !hasWorker || loading || saving || !dirty;
  }

  if (!authed) {
    profileStatus.textContent = "Sign in to edit your profile.";
    initialValues = {
      first_name: "",
      last_name: "",
      pronouns: "",
      timezone: "",
      location: "",
      bio: "",
    };
    applyValues(initialValues);
    setInputsDisabled(true);
    return;
  }

  if (loading) {
    profileStatus.textContent = "Loading profile…";
  } else if (saving) {
    profileStatus.textContent = "Saving changes…";
  } else if (state.profileError) {
    profileStatus.textContent = state.profileError;
  } else {
    profileStatus.textContent = "";
  }

  if (!hasWorker) {
    applyValues({
      first_name: "",
      last_name: "",
      pronouns: "",
      timezone: "",
      location: "",
      bio: "",
    });
    setInputsDisabled(true);
    return;
  }

  if (!dirty && !saving) {
    initialValues = extractWorkerValues(worker);
    applyValues(initialValues);
    profileForm.dataset.dirty = "false";
  }
}
