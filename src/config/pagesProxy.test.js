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
    expect(upstream).not.toHaveBeenCalled();
  });
});
