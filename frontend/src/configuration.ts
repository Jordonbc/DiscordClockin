import {
  DEFAULT_DISCORD_AUTHORIZE_URL,
  DISCORD_OAUTH_STATE_KEY,
} from "./constants";
import { getRuntimeConfig } from "./runtimeConfig";
import { state } from "./state";
import { showToast } from "./ui/notifications";
import { updateConnectionIndicator } from "./connectionStatus";

const config = getRuntimeConfig();

export function normalizeBaseUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch (error) {
    throw new Error("Invalid backend URL");
  }

  let { pathname } = parsed;
  const hasVersion = /\/api\/v\d+(?:\/|$)/i.test(pathname);
  const endsWithApi = /\/api\/?$/i.test(pathname);
  const isRoot = pathname === "/" || pathname === "";

  if (hasVersion) {
    if (!pathname.endsWith("/")) {
      pathname = `${pathname}/`;
    }
  } else if (isRoot) {
    pathname = "/api/v1/";
  } else if (endsWithApi) {
    pathname = pathname.replace(/\/api\/?$/i, "/api/v1/");
  } else if (!pathname.endsWith("/")) {
    pathname = `${pathname}/`;
  }

  parsed.pathname = pathname;
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString();
}

export function configureBaseUrl(): void {
  const configured =
    config && typeof config.apiBaseUrl === "string"
      ? config.apiBaseUrl.trim()
      : "";

  if (!configured) {
    state.baseUrl = "";
    updateConnectionIndicator({
      ok: false,
      message: "Backend not configured",
    });
    return;
  }

  try {
    state.baseUrl = normalizeBaseUrl(configured);
    updateConnectionIndicator({ ok: true });
  } catch (error) {
    state.baseUrl = "";
    const message =
      error instanceof Error ? error.message : "Invalid backend URL";
    updateConnectionIndicator({ ok: false, message });
    showToast(message, "error");
  }
}

export function configureGuild(): void {
  const guildId =
    config && typeof config.guildId === "string" ? config.guildId.trim() : "";

  state.guildId = guildId;

  if (!guildId) {
    console.warn(
      "Guild ID is not configured; backend requests require a guild context.",
    );
  }
}

export function configureDiscordLogin(): void {
  const clientId =
    config && typeof config.discordClientId === "string"
      ? config.discordClientId.trim()
      : "";

  if (!clientId) {
    console.warn("Discord login is not configured; missing client ID.");
  }

  state.discordClientId = clientId;

  const redirectUri =
    config && typeof config.discordRedirectUri === "string"
      ? config.discordRedirectUri.trim()
      : "";

  const { origin, pathname, search } = window.location;
  state.discordRedirectUri = redirectUri || `${origin}${pathname}${search}`;

  const authorizeUrl =
    config && typeof config.discordAuthorizeUrl === "string"
      ? config.discordAuthorizeUrl.trim()
      : "";
  state.discordAuthorizeUrl = authorizeUrl || DEFAULT_DISCORD_AUTHORIZE_URL;

  const scopes = Array.isArray(config.discordScopes)
    ? config.discordScopes
        .map((scope) => (typeof scope === "string" ? scope.trim() : ""))
        .filter(Boolean)
    : [];
  state.discordScopes = scopes.length ? scopes : ["identify"];

  state.adminUserIds = Array.isArray(config.adminUserIds)
    ? config.adminUserIds
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean)
    : [];
}

export function clearOAuthState(): void {
  try {
    window.sessionStorage.removeItem(DISCORD_OAUTH_STATE_KEY);
  } catch (error) {
    console.warn("Unable to clear OAuth state", error);
  }
}
