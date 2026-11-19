import { expect, test } from "bun:test";
import { createHandler, homeWorld } from "../server/app";

const handle = createHandler("public");
const get = (path: string) => handle(new Request("http://localhost" + path));
test("the server provides a stable starting island", async () => {
  expect(await (await get("/api/world")).json()).toEqual(homeWorld);
});
test("serves public assets and rejects unknown paths", async () => {
  expect((await get("/ripple-mark.svg")).headers.get("content-type")).toContain("image/svg+xml");
  expect((await get("/.env")).status).toBe(404);
  expect((await get("/api/nonexistent")).status).toBe(404);
});

test("HEAD reports the same asset length as GET", async () => {
  const url = "http://localhost/simulation.wasm";
  const head = await handle(new Request(url, { method: "HEAD" }));
  const body = await (await handle(new Request(url))).arrayBuffer();
  expect(head.headers.get("content-length")).toBe(String(body.byteLength));
  expect(await head.text()).toBe("");
});
