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
