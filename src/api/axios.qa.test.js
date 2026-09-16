import rawAxios from "axios";
import api, { getCsrfCookieAPI } from "./axios";
import { loginAdminAPI, logoutAdminAPI } from "./admin/request";
import { beforeEach, expect, it, vi } from "vitest";

let adapter;
const csrf = (config) => config.url.includes("/sanctum/csrf-cookie");
const response = (config, data = { ok: true }) => ({
  config, data, status: 200, statusText: "OK", headers: {},
});
const setCookie = () => { document.cookie = "XSRF-TOKEN=qa-token; path=/"; };
const csrfCalls = () => adapter.mock.calls.filter(([config]) => csrf(config));

beforeEach(() => {
  for (const cookie of document.cookie.split(";")) {
    document.cookie = cookie.split("=")[0].trim() + "=; Max-Age=0; path=/";
  }
  adapter = vi.fn(async (config) => {
    if (csrf(config)) setCookie();
    return response(config);
  });
  rawAxios.defaults.adapter = adapter;
  api.defaults.adapter = adapter;
});

it("QA: first mutation gets CSRF once, subsequent mutation reuses cookie", async () => {
  await api.post("/qa-mutation", {});
  await api.patch("/qa-mutation", {});
  expect(csrfCalls()).toHaveLength(1);
  expect(adapter).toHaveBeenCalledTimes(3);
});

it("QA: valid cookie skips CSRF request", async () => {
  setCookie(); await api.post("/qa-mutation", {});
  expect(csrfCalls()).toHaveLength(0);
});

it("QA: similar cookie name does not count as the real XSRF cookie", async () => {
  document.cookie = "MY-XSRF-TOKEN=abc; path=/";
  await api.post("/qa-mutation", {});
  expect(csrfCalls()).toHaveLength(1);
});

it("QA: empty cookie triggers initialization", async () => {
  document.cookie = "XSRF-TOKEN=; path=/";
  await getCsrfCookieAPI();
  expect(csrfCalls()).toHaveLength(1);
});

it("QA: concurrent mutations share one CSRF GET", async () => {
  await Promise.all([api.post("/qa-a", {}), api.put("/qa-b", {}), api.delete("/qa-c")]);
  expect(csrfCalls()).toHaveLength(1);
  expect(adapter).toHaveBeenCalledTimes(4);
});

it("QA: ordinary GET does not initialize CSRF", async () => {
  await api.get("/qa-get");
  expect(csrfCalls()).toHaveLength(0);
});

it.each([loginAdminAPI, logoutAdminAPI])(
  "QA: real auth wrapper does not fetch CSRF twice (%#)", async (wrapper) => {
    await wrapper({});
    expect(csrfCalls()).toHaveLength(1);
    expect(adapter).toHaveBeenCalledTimes(2);
  }
);

it("QA: failed CSRF rejects mutation and permits a later attempt", async () => {
  adapter.mockImplementationOnce(async () => { throw new Error("csrf unavailable"); });
  await expect(api.post("/qa-mutation", {})).rejects.toThrow("csrf unavailable");
  expect(adapter).toHaveBeenCalledTimes(1);
  await api.post("/qa-mutation", {});
  expect(csrfCalls()).toHaveLength(2);
  expect(adapter).toHaveBeenCalledTimes(3);
});

it("QA: mutation 419 refreshes CSRF and replays once", async () => {
  setCookie();
  let mutationCalls = 0;
  adapter.mockImplementation(async (config) => {
    if (csrf(config)) {
      setCookie();
      return response(config);
    }
    mutationCalls += 1;
    if (mutationCalls === 1) {
      throw Object.assign(new Error("expired"), { response: { status: 419 }, config });
    }
    return response(config);
  });
  await expect(api.post("/qa-mutation", {})).resolves.toEqual({ ok: true });
  expect(csrfCalls()).toHaveLength(1);
  expect(mutationCalls).toBe(2);
  expect(adapter).toHaveBeenCalledTimes(3);
});

it("QA: repeated mutation 419 is rejected after one replay", async () => {
  setCookie();
  adapter.mockImplementation(async (config) => {
    if (csrf(config)) return response(config);
    throw Object.assign(new Error("expired"), { response: { status: 419 }, config });
  });
  await expect(api.post("/qa-mutation", {})).rejects.toMatchObject({ response: { status: 419 } });
  expect(csrfCalls()).toHaveLength(1);
  expect(adapter).toHaveBeenCalledTimes(3);
});

it("QA: mutation keeps credential and XSRF configuration", async () => {
  setCookie(); await api.post("/qa-mutation", {});
  const config = adapter.mock.calls[0][0];
  expect(config.withCredentials).toBe(true);
  expect(config.withXSRFToken).toBe(true);
  expect(config.xsrfCookieName).toBe("XSRF-TOKEN");
  expect(config.xsrfHeaderName).toBe("X-XSRF-TOKEN");
});


it("aborting one mutation does not cancel CSRF bootstrap shared with another", async () => {
  let release;
  adapter.mockImplementation(config => csrf(config)
    ? new Promise(resolve => { release = () => { setCookie(); resolve(response(config)); }; })
    : Promise.resolve(response(config)));
  const controller = new AbortController();
  const first = api.post("/qa-aborted", {}, { signal: controller.signal });
  const firstResult = expect(first).rejects.toMatchObject({ code: "ERR_CANCELED" });
  const second = api.post("/qa-survives", {});
  await vi.waitFor(() => expect(csrfCalls()).toHaveLength(1));
  expect(csrfCalls()[0][0].timeout).toBe(5000);
  controller.abort();
  await firstResult;
  release();
  await second;
  expect(adapter.mock.calls.some(([config]) => config.url === "/qa-aborted")).toBe(false);
  expect(adapter.mock.calls.some(([config]) => config.url === "/qa-survives")).toBe(true);
});

it("malformed cookie encoding is repaired rather than breaking every mutation", async () => {
  document.cookie = "XSRF-TOKEN=%E0%A4; path=/";
  await api.post("/qa-mutation", {});
  expect(csrfCalls()).toHaveLength(1);
});
