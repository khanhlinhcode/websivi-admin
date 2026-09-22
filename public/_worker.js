const withTransportSecurity = async (responsePromise) => {
  const response = await responsePromise;
  const secured = new Response(response.body, response);
  secured.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return secured;
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/") && url.pathname !== "/sanctum/csrf-cookie") {
      return withTransportSecurity(env.ASSETS.fetch(request));
    }

    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) {
      return withTransportSecurity(new Response("Forbidden", { status: 403 }));
    }

    let upstream;
    try {
      upstream = new URL(env.API_ORIGIN);
      if (upstream.protocol !== "https:" || upstream.pathname !== "/" || upstream.search || upstream.hash) {
        throw new Error("Invalid API origin");
      }
    } catch {
      return withTransportSecurity(new Response("API unavailable", { status: 503 }));
    }

    upstream.pathname = url.pathname;
    upstream.search = url.search;
    return withTransportSecurity(fetch(new Request(upstream, request), { redirect: "manual" }));
  },
};
