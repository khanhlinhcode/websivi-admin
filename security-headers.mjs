export const buildSecurityHeaders = (apiUrl) => {
  let apiOrigin;
  try {
    apiOrigin = new URL(apiUrl).origin;
  } catch {
    apiOrigin = "";
  }

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    // Existing React components use a small number of inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://res.cloudinary.com",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}`,
    "font-src 'self' data:",
  ].join("; ");

  return `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), geolocation=(), microphone=()\n`;
};
