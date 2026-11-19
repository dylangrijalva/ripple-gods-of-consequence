import { createServer } from "vite";
import { createHandler } from "../server/app";

const api = Bun.serve({ port: 0, fetch: createHandler("dist") });
const vite = await createServer({
  server: { proxy: { "/api": `http://127.0.0.1:${api.port}` } }
});
await vite.listen();
vite.printUrls();
