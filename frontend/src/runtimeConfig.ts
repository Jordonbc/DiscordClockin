import type { FrontendConfig } from "./types";

declare global {
  interface Window {
    CLOCKIN_FRONTEND_CONFIG?: FrontendConfig;
  }
}

export function getRuntimeConfig(): FrontendConfig {
  return window.CLOCKIN_FRONTEND_CONFIG ?? {};
}
