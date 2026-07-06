export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { handleMockSupabaseRequest } = await import("./lib/mock-db-handler");

    const originalFetch = globalThis.fetch;

    globalThis.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      // Intercept calls to supabase URL
      if (url.includes("supabase.co") || url.includes("/api/mock-supabase")) {
        const method = init?.method || "GET";
        const headers: Record<string, string> = {};
        
        if (init?.headers) {
          if (init.headers instanceof Headers) {
            init.headers.forEach((v, k) => {
              headers[k] = v;
            });
          } else if (Array.isArray(init.headers)) {
            init.headers.forEach(([k, v]) => {
              headers[k] = v;
            });
          } else {
            Object.entries(init.headers).forEach(([k, v]) => {
              headers[k] = String(v);
            });
          }
        }

        let bodyText = "";
        if (init?.body) {
          if (typeof init.body === "string") {
            bodyText = init.body;
          } else if (init.body instanceof Buffer) {
            bodyText = init.body.toString("binary");
          } else if (init.body instanceof ArrayBuffer) {
            bodyText = Buffer.from(init.body).toString("binary");
          } else if (ArrayBuffer.isView(init.body)) {
            bodyText = Buffer.from(init.body.buffer, init.body.byteOffset, init.body.byteLength).toString("binary");
          } else if (init.body instanceof URLSearchParams) {
            bodyText = init.body.toString();
          } else if (typeof (init.body as any).text === "function") {
            try {
              bodyText = await (init.body as any).text();
            } catch {}
          } else {
            try {
              bodyText = String(init.body);
            } catch {}
          }
        }

        const res = await handleMockSupabaseRequest(url, method, headers, bodyText);

        // Return a mock Response object
        return new Response(res.status === 204 ? null : JSON.stringify(res.body), {
          status: res.status,
          statusText:
            res.status === 204
              ? "No Content"
              : res.status === 201
              ? "Created"
              : "OK",
          headers: {
            "Content-Type": "application/json",
            ...res.headers,
          },
        });
      }

      return originalFetch.apply(this, arguments as any);
    };

    console.log(
      "[Mock Supabase Interceptor] Global server-side fetch interceptor registered successfully!"
    );
  }
}
