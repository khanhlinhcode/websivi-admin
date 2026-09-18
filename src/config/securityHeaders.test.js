import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "../../security-headers.mjs";

describe("deployment security headers", () => {
  it("enforces CSP for the admin application", () => {
    const headers = buildSecurityHeaders("https://api.example.test/api");

    expect(headers).toContain("Content-Security-Policy:");
    expect(headers).toContain("connect-src 'self' https://api.example.test");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).not.toContain("script-src *");
    expect(headers).not.toContain("'unsafe-eval'");
  });
});
