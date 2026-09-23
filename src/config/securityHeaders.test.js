import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "../../security-headers.mjs";

describe("deployment security headers", () => {
  it("enforces CSP for the admin application", () => {
    const headers = buildSecurityHeaders("https://api.example.test/api");

    expect(headers).toContain("Content-Security-Policy:");
    expect(headers).toContain("Strict-Transport-Security: max-age=31536000; includeSubDomains");
    expect(headers).toContain("connect-src 'self' https://api.example.test");
    expect(headers).toContain("https://static.cloudflareinsights.com");
    expect(headers).toContain("https://cloudflareinsights.com");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).not.toContain("script-src *");
    expect(headers).not.toContain("'unsafe-eval'");
  });

  it("keeps API requests same-origin when using the Pages proxy", () => {
    const headers = buildSecurityHeaders("/api");

    expect(headers).toContain("connect-src 'self' https://cloudflareinsights.com");
    expect(headers).not.toContain("127.0.0.1");
  });
});
