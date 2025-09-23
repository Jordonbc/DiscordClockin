import type { FrontendConfig } from "./scripts/types";

declare global {
  interface Window {
    CLOCKIN_FRONTEND_CONFIG?: FrontendConfig;
  }
}

const runtimeConfig: FrontendConfig = {
  apiBaseUrl: "http://127.0.0.1:8080",
  guildId: "1016787224391585823",
  discordClientId: "1418388811016310805",
  discordRedirectUri: "http://localhost:3000",
  discordScopes: ["identify"],
  adminUserIds: ["104546226938073088"],
};

window.CLOCKIN_FRONTEND_CONFIG = runtimeConfig;

export {};
