import { state } from "./state.js";
import { showToast } from "./ui/notifications.js";
import { updateConnectionIndicator } from "./connectionStatus.js";

export interface ApiRequestOptions {
  path: string;
  method?: string;
  body?: unknown;
  expectJson?: boolean;
  silent?: boolean;
}

export function requireBaseUrl(): void {
  if (!state.baseUrl) {
    const message = "Backend connection is not configured.";
    updateConnectionIndicator({ ok: false, message });
    showToast(message, "error");
    throw new Error("Missing base URL");
  }
}

export function ensureGuildConfigured(): void {
  if (!state.guildId) {
    const message = "Guild ID is not configured.";
    showToast(message, "error");
    throw new Error("Missing guild ID");
  }
}

export async function apiRequest({
  path,
  method = "GET",
  body,
  expectJson = true,
  silent = false,
}: ApiRequestOptions) {
  requireBaseUrl();
  const sanitizedPath = typeof path === "string" ? path.replace(/^\/+/, "") : "";
  const url = new URL(sanitizedPath, state.baseUrl);
  const options: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: { Accept: "application/json" },
    credentials: "include",
  };

  if (body !== undefined && method !== "GET") {
    options.body = JSON.stringify(body);
    options.headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
    });
    const contentType = response.headers.get("content-type") || "";
    const isJson = expectJson && contentType.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        data && typeof data === "object" && (data as any).message
          ? (data as any).message
          : typeof data === "string"
          ? data
          : "Request failed";
      const error: any = new Error(message || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    updateConnectionIndicator({ ok: true });
    return data;
  } catch (error: any) {
    const message =
      error instanceof Error ? error.message : "Unable to reach the backend";

    if (error && typeof error === "object" && "status" in error) {
      if ((error as any).status === 401) {
        updateConnectionIndicator({ ok: true });
      } else {
        updateConnectionIndicator({ ok: false, message });
      }

      if (!silent && (error as any).status !== 401) {
        showToast(message, "error");
      }
    } else {
      updateConnectionIndicator({ ok: false, message });
      if (!silent) {
        showToast(message, "error");
      }
    }

    throw error;
  }
}
