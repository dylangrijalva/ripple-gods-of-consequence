import { resolve, sep } from "node:path";

export const homeWorld = { name: "Brinehaven", seed: 4729 } as const;

export function createHandler(distDirectory: string) {
  const root = resolve(distDirectory);
  return async function handle(request: Request): Promise<Response> {
    if (!["GET", "HEAD"].includes(request.method)) {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const { pathname } = new URL(request.url);
    if (pathname === "/api/world" || pathname === "/healthz") {
      return Response.json(pathname === "/api/world" ? homeWorld : { status: "ok" });
    }
    let path: string;
    try {
      path = decodeURIComponent(pathname);
    } catch {
      return new Response("Invalid path", { status: 400 });
    }
    if (path.includes("\0") || path.split("/").some(part => part.startsWith("."))) {
      return new Response(null, { status: 404 });
    }
    const fullPath = resolve(root, "." + (path === "/" ? "/index.html" : path));
    if (!fullPath.startsWith(root + sep)) return new Response(null, { status: 404 });
    const file = Bun.file(fullPath);
    if (!await file.exists()) return new Response(null, { status: 404 });
    return new Response(request.method === "HEAD" ? null : file, {
      headers: {
        "Content-Type": path.endsWith(".wasm") ? "application/wasm" : file.type,
        "Cache-Control": path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
        "X-Content-Type-Options": "nosniff"
      }
    });
  };
}
