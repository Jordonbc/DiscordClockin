import {
  DISCORD_OAUTH_STATE_KEY,
  DISCORD_STORAGE_KEY,
  DISCORD_USER_API_URL,
} from "./constants";
import { state } from "./state";
import { showToast } from "./ui/notifications";
import { renderAuthState } from "./authState";
import { refreshMyTime } from "./timesheetData";

function generateOAuthStateToken(length = 16): string {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (value) => value.toString(16).padStart(2, "0")).join("");
  }

  let result = "";
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

function storeOAuthState(value: string): void {
  try {
    window.sessionStorage.setItem(DISCORD_OAUTH_STATE_KEY, value);
  } catch (error) {
    console.warn("Unable to persist OAuth state", error);
  }
}

function consumeOAuthState(received: string | null): boolean {
  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(DISCORD_OAUTH_STATE_KEY);
    window.sessionStorage.removeItem(DISCORD_OAUTH_STATE_KEY);
  } catch (error) {
    console.warn("Unable to read OAuth state", error);
  }

  if (!stored) {
    return true;
  }

  return stored === received;
}

function persistDiscordSession(session: unknown): void {
  try {
    window.localStorage.setItem(DISCORD_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("Unable to persist Discord session", error);
  }
}

function loadPersistedDiscordSession(): any | null {
  try {
    const raw = window.localStorage.getItem(DISCORD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!(parsed as any).accessToken || !(parsed as any).tokenType) return null;
    if ((parsed as any).expiresAt && Date.now() >= (parsed as any).expiresAt) {
      clearPersistedDiscordSession();
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn("Unable to load Discord session", error);
    return null;
  }
}

function clearPersistedDiscordSession(): void {
  try {
    window.localStorage.removeItem(DISCORD_STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to clear Discord session", error);
  }
}

function clearUrlHash(): void {
  const { pathname, search } = window.location;
  window.history.replaceState(null, document.title, `${pathname}${search}`);
}

function extractTokenFromHash(): any | null {
  const { hash } = window.location;
  if (!hash || hash.length <= 1) return null;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get("access_token");
  if (!accessToken) return null;

  const stateParam = params.get("state");
  const stateValid = consumeOAuthState(stateParam);
  if (!stateValid) {
    showToast("Login verification failed. Please try again.", "error");
    clearUrlHash();
    return null;
  }

  const tokenType = params.get("token_type") || "Bearer";
  const expiresIn = parseInt(params.get("expires_in") || "", 10);
  const scope = params.get("scope");
  const now = Date.now();
  const expiresAt = Number.isFinite(expiresIn)
    ? now + Math.max(0, expiresIn) * 1000
    : now + 3600 * 1000;

  clearUrlHash();

  return {
    accessToken,
    tokenType,
    expiresAt,
    scope,
  };
}

export function clearDiscordSession(options: { skipStorage?: boolean } = {}): void {
  state.discordToken = null;
  state.user = null;
  state.adminOverview = null;
  state.adminOverviewError = null;
  state.adminOverviewLoading = false;
  state.adminActiveTab = "departments";
  if (!options.skipStorage) {
    clearPersistedDiscordSession();
  }
}

async function fetchDiscordProfile(token: any): Promise<any> {
  const response = await fetch(DISCORD_USER_API_URL, {
    headers: {
      Authorization: `${token.tokenType} ${token.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Discord profile: ${response.status}`);
  }

  return response.json();
}

function resolveAvatarUrl(profile: any): string {
  if (profile.avatar) {
    return `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128`;
  }

  const discriminator = profile.discriminator ? Number.parseInt(profile.discriminator, 10) : 0;
  const index = Number.isFinite(discriminator) ? discriminator % 5 : 0;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function resolveUserRoles(userId: string): string[] {
  if (!userId) return [];
  return state.adminUserIds.includes(userId) ? ["admin"] : [];
}

export async function hydrateDiscordSession(): Promise<void> {
  const fragmentToken = extractTokenFromHash();
  const hadFragment = Boolean(fragmentToken);

  if (fragmentToken) {
    state.discordToken = fragmentToken;
    persistDiscordSession(fragmentToken);
  } else {
    const storedToken = loadPersistedDiscordSession();
    if (storedToken) {
      state.discordToken = storedToken;
    }
  }

  if (!state.discordToken) {
    renderAuthState();
    return;
  }

  if (state.discordToken.expiresAt && Date.now() >= state.discordToken.expiresAt) {
    clearDiscordSession();
    renderAuthState();
    return;
  }

  try {
    const profile = await fetchDiscordProfile(state.discordToken);
    state.user = {
      id: profile.id,
      username: profile.username,
      displayName: profile.global_name || profile.username,
      avatarUrl: resolveAvatarUrl(profile),
      roles: resolveUserRoles(profile.id),
    };

    if (hadFragment) {
      showToast(`Welcome, ${state.user.displayName || state.user.username}!`, "success");
    }

    if (state.baseUrl && state.guildId) {
      await refreshMyTime();
    }
  } catch (error) {
    console.error("Unable to hydrate Discord session", error);
    clearDiscordSession();
    showToast("Discord session expired. Please sign in again.", "error");
  } finally {
    renderAuthState();
  }
}

export function initiateLogin(): void {
  if (!state.discordClientId) {
    showToast("Discord login is not configured.", "error");
    return;
  }

  const oauthState = generateOAuthStateToken();
  storeOAuthState(oauthState);

  const params = new URLSearchParams({
    client_id: state.discordClientId,
    redirect_uri: state.discordRedirectUri,
    response_type: "token",
    scope: state.discordScopes.join(" "),
    state: oauthState,
    prompt: "consent",
  });

  const authorizeUrl = `${state.discordAuthorizeUrl}?${params.toString()}`;
  window.location.href = authorizeUrl;
}
