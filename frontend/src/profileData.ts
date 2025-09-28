import { apiRequest } from "./apiClient";
import { state } from "./state";
import { renderProfileView } from "./ui/profile";
import { showToast } from "./ui/notifications";

export interface ProfileFormValues {
  first_name: string;
  last_name: string;
  pronouns: string;
  timezone: string;
  location: string;
  bio: string;
}

function sanitize(value: string): string {
  return value.trim();
}

function buildRequestPayload(values: ProfileFormValues): Record<string, string | null> {
  return {
    first_name: sanitize(values.first_name) || null,
    last_name: sanitize(values.last_name) || null,
    pronouns: sanitize(values.pronouns) || null,
    timezone: sanitize(values.timezone) || null,
    location: sanitize(values.location) || null,
    bio: sanitize(values.bio) || null,
  };
}

export async function loadProfile(options: { silent?: boolean } = {}): Promise<void> {
  if (!state.user) {
    return;
  }

  if (!state.guildId) {
    state.profileError = "Guild ID is not configured.";
    state.workerProfile = null;
    renderProfileView();
    return;
  }

  if (state.profileLoading) {
    return;
  }

  state.profileLoading = true;
  state.profileError = null;
  renderProfileView();

  try {
    const path = `profile/${encodeURIComponent(state.guildId)}/${encodeURIComponent(state.user.id)}`;
    const data = await apiRequest({ path, silent: options.silent ?? true });
    const worker = (data as any)?.worker;
    state.workerProfile = worker || null;
    if (!worker) {
      state.profileError = "No worker record found. Ask an administrator to register you.";
    } else {
      state.profileError = null;
    }
  } catch (error: any) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      state.profileError = "No worker record found. Ask an administrator to register you.";
      state.workerProfile = null;
      if (!options.silent) {
        showToast(state.profileError, "info");
      }
    } else {
      state.profileError = "Failed to load profile.";
      if (!options.silent) {
        showToast(state.profileError, "error");
      }
    }
  } finally {
    state.profileLoading = false;
    renderProfileView();
  }
}

export async function saveProfile(values: ProfileFormValues): Promise<void> {
  if (!state.user || !state.guildId) {
    return;
  }

  if (state.profileSaving) {
    return;
  }

  state.profileSaving = true;
  renderProfileView();

  try {
    const path = `profile/${encodeURIComponent(state.guildId)}/${encodeURIComponent(state.user.id)}`;
    const body = buildRequestPayload(values);
    const response = await apiRequest({ path, method: "PATCH", body });
    const worker = (response as any)?.worker;
    state.workerProfile = worker || state.workerProfile;
    state.profileError = null;
    showToast("Profile updated.", "success");
    window.dispatchEvent(new CustomEvent("clockin:profile-updated"));
  } catch (error) {
    showToast("Failed to update profile.", "error");
  } finally {
    state.profileSaving = false;
    renderProfileView();
  }
}
