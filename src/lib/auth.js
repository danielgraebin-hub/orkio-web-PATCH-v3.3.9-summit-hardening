export const LS_TOKEN = "orkio_token";
export const LS_USER = "orkio_user";
export const LS_TENANT = "orkio_tenant";

export function getToken() {
  return localStorage.getItem(LS_TOKEN) || "";
}
export function getTenant() {
  return localStorage.getItem(LS_TENANT) || "public";
}
export function getUser() {
  try { return JSON.parse(localStorage.getItem(LS_USER) || "null"); } catch { return null; }
}
export function setSession({ token, user, tenant }) {
  if (token) localStorage.setItem(LS_TOKEN, token);
  if (tenant) localStorage.setItem(LS_TENANT, tenant);
  if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
}

export function setUser(user) {
  if (!user) {
    localStorage.removeItem(LS_USER);
    return;
  }
  localStorage.setItem(LS_USER, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
  localStorage.removeItem(LS_TENANT);
}
export function isAdmin(user) {
  return user?.role === "admin";
}

export function isApproved(user) {
  return !!(user && (user.role === "admin" || user.approved_at));
}

export function hasCompletedOnboarding(user) {
  return !!(user && user.onboarding_completed);
}
