export const ADMIN_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";
export const ADMIN_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const ADMIN_IMAGE_TYPES = new Set(ADMIN_IMAGE_ACCEPT.split(","));

export const isValidAdminImage = (file) => Boolean(
  file
  && ADMIN_IMAGE_TYPES.has(file.type)
  && file.size <= ADMIN_IMAGE_MAX_BYTES
);

export const formatAdminImageSize = (bytes = 0) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024) + " MB";
