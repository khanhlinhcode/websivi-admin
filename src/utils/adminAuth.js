export const ADMIN_ROLES = {
  ADMIN: "admin",
  STAFF: "staff",
};

const LEGACY_ADMIN_KEYS = ["farta_admin_token", "farta_admin_role"];

const getStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;

export const clearAdminSession = () => {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  LEGACY_ADMIN_KEYS.forEach((key) => storage.removeItem(key));
};

export const getAdminRole = (adminUser) => adminUser?.role || "";

export const hasAdminRole = (adminUser, allowedRoles) => {
  const role = getAdminRole(adminUser);

  return Boolean(role && allowedRoles.includes(role));
};

export const hasAdminAccess = (adminUser) =>
  hasAdminRole(adminUser, [ADMIN_ROLES.ADMIN, ADMIN_ROLES.STAFF]);

export const isAdmin = (adminUser) =>
  getAdminRole(adminUser) === ADMIN_ROLES.ADMIN;
