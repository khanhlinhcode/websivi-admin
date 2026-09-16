const trimTrailingSlashes = (value) => value.replace(/\/+$/, "");

export const getApiBaseUrl = () => {
  const configuredUrl = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.REACT_APP_API_URI ||
    ""
  ).trim();

  if (configuredUrl) {
    return trimTrailingSlashes(configuredUrl);
  }

  if (import.meta.env.PROD) {
    return "/api";
  }

  return "http://127.0.0.1:8000/api";
};

export const getApiRootUrl = () => getApiBaseUrl().replace(/\/api\/?$/, "");
