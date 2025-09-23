import type { FrontendConfig } from "./scripts/types";

declare global {
  interface Window {
    CLOCKIN_FRONTEND_CONFIG?: FrontendConfig;
  }
}

const runtimeConfig: FrontendConfig = {
  apiBaseUrl: "http://127.0.0.1:8080",
  guildId: "YOUR_GUILD_ID",
  discordClientId: "YOUR_DISCORD_CLIENT_ID",
  discordRedirectUri: "http://localhost:3000",
  discordScopes: ["identify"],
  adminUserIds: ["YOUR_DISCORD_USER_ID"],
};

window.CLOCKIN_FRONTEND_CONFIG = runtimeConfig;

export {};
