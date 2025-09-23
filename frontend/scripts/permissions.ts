import { state } from "./state.js";

export function canAccessAdmin(): boolean {
  return Boolean(
    state.user &&
      Array.isArray(state.user.roles) &&
      state.user.roles.includes("admin"),
  );
}
