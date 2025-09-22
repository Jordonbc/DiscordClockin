// Frontend runtime configuration. Update `apiBaseUrl` to point at your ClockIn backend.
window.CLOCKIN_FRONTEND_CONFIG = {
  // Base URL of the ClockIn backend, including protocol and any path prefix.
  apiBaseUrl: "http://127.0.0.1:8080",

  // Discord guild managed by this dashboard.
  guildId: "1016787224391585823",

  // Discord OAuth2 implicit grant configuration.
  discordClientId: "1418388811016310805",
  discordRedirectUri: "http://localhost:3000",
  discordScopes: ["identify"],

  // Treat these Discord user IDs as admins within the UI.
  adminUserIds: ["104546226938073088"],
};
