// Copy this file to `config.js` and update the values to match your environment.
window.CLOCKIN_FRONTEND_CONFIG = {
  // Base URL of the ClockIn backend, e.g. "http://localhost:3000" or "https://clockin.example.com/api".
  apiBaseUrl: "http://localhost:3000",

  // Discord guild ID that the portal should manage.
  guildId: "123456789012345678",

  // Discord OAuth2 client ID used for the implicit grant flow.
  discordClientId: "123456789012345678",

  // (Optional) Override the redirect URI used after Discord authorizes the user.
  // Defaults to the current page.
  discordRedirectUri: "http://localhost:4173",

  // (Optional) Scopes requested during login. Defaults to ["identify"].
  discordScopes: ["identify"],

  // (Optional) IDs that should be treated as admins in the UI.
  adminUserIds: ["123456789012345678"],
};
