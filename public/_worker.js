export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/") && url.pathname !== "/sanctum/csrf-cookie") {
      return env.ASSETS.fetch(request);
    }

    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) {
      return new Response("Forbidden", { status: 403 });
    }

    let upstream;
    try {
      upstream = new URL(env.API_ORIGIN);
      if (upstream.protocol !== "https:" || upstream.pathname !== "/" || upstream.search || upstream.hash) {
        throw new Error("Invalid API origin");
      }
    } catch {
      return new Response("API unavailable", { status: 503 });
    }

    upstream.pathname = url.pathname;
    upstream.search = url.search;
    return fetch(new Request(upstream, request), { redirect: "manual" });
  },
};
