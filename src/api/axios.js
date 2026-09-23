import axios from "axios";
import { getApiBaseUrl, getApiRootUrl } from "../config/api";

const baseURL = getApiBaseUrl();
const timeout =
  Number(import.meta.env.VITE_API_TIME_OUT || import.meta.env.REACT_APP_API_TIME_OUT) || 20000;

let csrfCookieRequest = null;
const CSRF_TIMEOUT_MS = 5000;
const unsafeMethods = new Set(["post", "put", "patch", "delete"]);

const clearXsrfHeader = (headers) => {
  if (!headers) return;

  if (typeof headers.delete === "function") {
    headers.delete("X-XSRF-TOKEN");
    headers.delete("x-xsrf-token");
    return;
  }

  delete headers["X-XSRF-TOKEN"];
  delete headers["x-xsrf-token"];
};

const hasXsrfTokenCookie = () => {
  if (typeof document === "undefined" || !document.cookie) {
    return false;
  }
  return document.cookie.split(";").some((cookie) => {
    const trimmed = cookie.trim();
    if (trimmed.startsWith("XSRF-TOKEN=")) {
      const value = trimmed.slice("XSRF-TOKEN=".length);
      try {
        return Boolean(value && decodeURIComponent(value).trim() !== "");
      } catch {
        return false;
      }
    }
    return false;
  });
};

export const getCsrfCookieAPI = async ({ force = false } = {}) => {
  if (!force && hasXsrfTokenCookie()) {
    return Promise.resolve();
  }

  if (!csrfCookieRequest) {
    csrfCookieRequest = axios
      .get(`${getApiRootUrl()}/sanctum/csrf-cookie`, {
        withCredentials: true,
        timeout: CSRF_TIMEOUT_MS,
        headers: {
          Accept: "application/json",
        },
      })
      .finally(() => {
        csrfCookieRequest = null;
      });
  }

  return csrfCookieRequest;
};

const axiosInstance = axios.create({
  baseURL,
  timeout,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});
axiosInstance.interceptors.request.use(
  async function (config) {
    if (config.signal?.aborted) throw new axios.CanceledError();
    if (unsafeMethods.has(String(config.method || "get").toLowerCase())) {
      const csrf = getCsrfCookieAPI();
      if (!config.signal) await csrf;
      else {
        let onAbort;
        try {
          await Promise.race([
            csrf,
            new Promise((resolve, reject) => {
              onAbort = () => reject(new axios.CanceledError());
              config.signal.addEventListener("abort", onAbort, { once: true });
              if (config.signal.aborted) onAbort();
            }),
          ]);
        } finally {
          config.signal.removeEventListener("abort", onAbort);
        }
      }
    }

    config.headers = config.headers || {};

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else {
      config.headers["Content-Type"] = "application/json";
    }
    config.headers.Accept = "application/json";

    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);
axiosInstance.interceptors.response.use(
  function (response) {
    if (response.data) {
      return response.data;
    }
    return response;
  },
  async function (error) {
    const config = error.config;
    const method = String(config?.method || "get").toLowerCase();

    if (error.response?.status === 419 && config && unsafeMethods.has(method) && !config._csrfRetried) {
      config._csrfRetried = true;
      clearXsrfHeader(config.headers);
      await getCsrfCookieAPI({ force: true });
      clearXsrfHeader(config.headers);
      return axiosInstance.request(config);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
