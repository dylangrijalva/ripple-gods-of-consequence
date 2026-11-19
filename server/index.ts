import { createHandler } from "./app";
const server = Bun.serve({
  hostname: "0.0.0.0",
  port: Number(process.env.PORT ?? 3000),
  fetch: createHandler(new URL("../dist/", import.meta.url).pathname)
});
console.info(`Ripple is listening on port ${server.port}`);
