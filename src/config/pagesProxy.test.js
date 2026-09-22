// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../../public/_worker.js";

afterEach(() => vi.unstubAllGlobals());

describe("Pages API proxy", () => {
  it("forwards cookies to the fixed API origin and preserves session cookies", async () => {
    const upstream = vi.fn(async () => new Response("ok", {
      headers: { "Set-Cookie": "XSRF-TOKEN=test; Secure; SameSite=Lax" },
    }));
    vi.stubGlobal("fetch", upstream);

    const request = new Request("https://farta-admin.pages.dev/api/me", {
      headers: { Cookie: "laravel_session=test", Referer: "https://farta-admin.pages.dev/" },
    });
    const response = await worker.fetch(request, { API_ORIGIN: "https://api.example.test" });

    expect(upstream).toHaveBeenCalledOnce();
    expect(upstream.mock.calls[0][0].url).toBe("https://api.example.test/api/me");
    expect(upstream.mock.calls[0][0].headers.get("Cookie")).toBe("laravel_session=test");
    expect(response.headers.get("Set-Cookie")).toContain("XSRF-TOKEN=test");
    expect(response.headers.get("Strict-Transport-Security")).toBe("max-age=31536000; includeSubDomains");
  });

  it("rejects a cross-origin mutation before contacting the API", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const request = new Request("https://farta-admin.pages.dev/api/admin/login", {
      method: "POST",
      headers: { Origin: "https://attacker.example" },
    });

    const response = await worker.fetch(request, { API_ORIGIN: "https://api.example.test" });

    expect(response.status).toBe(403);
    expect(response.headers.get("Strict-Transport-Security")).toBe("max-age=31536000; includeSubDomains");
    expect(upstream).not.toHaveBeenCalled();
  });

  it("adds HSTS to static asset responses", async () => {
    const assets = { fetch: vi.fn(async () => new Response("admin")) };

    const response = await worker.fetch(
      new Request("https://farta-admin.pages.dev/"),
      { ASSETS: assets }
    );

    expect(response.headers.get("Strict-Transport-Security")).toBe("max-age=31536000; includeSubDomains");
  });

  it("keeps separate upstream cookies when adding response headers", async () => {
    const headers = new Headers();
    headers.append("Set-Cookie", "XSRF-TOKEN=test; Secure; SameSite=Lax");
    headers.append("Set-Cookie", "laravel_session=test; Secure; HttpOnly; SameSite=Lax");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ok", { headers })));

    const response = await worker.fetch(
      new Request("https://admin.fartamarket.company/api/admin/me"),
      { API_ORIGIN: "https://api.fartamarket.company" }
    );

    expect(response.headers.getSetCookie()).toHaveLength(2);
  });
});
