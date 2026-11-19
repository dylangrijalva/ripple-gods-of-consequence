import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function photograph(page: Page, name: string) {
  if (!process.env.CAPTURE_GAME) return;
  await mkdir("docs/screenshots", { recursive: true });
  await page.mouse.move(4, 4);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
  });
  await page.screenshot({ path: `docs/screenshots/${name}.jpg`, quality: 94, type: "jpeg" });
}

test("play an island, inspect its history and compare a fork", async ({page, request}) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await expect((await request.get("/api/world")).json()).resolves.toMatchObject({name: "Brinehaven", seed: 4729});
  const wasm = page.waitForResponse(response => response.url().endsWith("/simulation.wasm"));
  await page.goto("/");
  expect((await wasm).headers()["content-type"]).toContain("application/wasm");
  await expect(page.locator('[data-ready="true"]').first()).toBeVisible({timeout: 60_000});
  await expect(page.locator("canvas").first()).toBeVisible();
  const button = (name: string) => page.getByRole("button", {name, exact: true});
  await photograph(page, "main-menu");
  await button("Enter world").click();
  await photograph(page, "world-overview");
  await button("Pause time").click();
  await button("Powers").click();
  await button("Call rain").click();
  await expect(page.getByText("Rain fell over the island.", {exact: false}).first()).toBeVisible();
  await expect(page.getByRole("img", {name:/during rain$/})).toBeVisible();
  await photograph(page, "god-powers");
  for (let day = 0; day < 5; day++) await button("Advance one day").click();
  await expect(page.getByRole("img", {name:/during rain$/})).toHaveCount(0, {timeout: 20_000});
  await button("Civilization").click();
  await expect(page.getByRole("heading", {name:"Population over time"})).toBeVisible();
  await page.getByRole("button", {name:/^Water/}).click();
  await expect(page.getByRole("heading", {name:"Water over time"})).toBeVisible();
  await expect(page.getByRole("slider", {name:"Inspect chart day"})).toBeVisible();
  await photograph(page, "civilization-dashboard");
  await button("Timelines").click();
  await button("Create a branch").click();
  await button("Summon storm").click();
  await button("Compare outcomes").click();
  await expect(page.getByRole("heading", {name:"Seven days later"})).toBeVisible();
  const pop = page.getByRole("row", {name:/Population/}).getByRole("cell");
  expect(parseInt(await pop.nth(0).innerText())).toBeGreaterThan(parseInt(await pop.nth(1).innerText()));
  await photograph(page, "timeline-comparison");
  expect(errors).toEqual([]);
});

test("controls and saved progress work on a phone-sized viewport", async ({page}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const button = (name: string) => page.getByRole("button", {name, exact: true});
  await button("Enter world").click({timeout: 60_000});
  await button("Pause time").click();
  const day = page.locator(".map-status");
  const previous = Number((await day.innerText()).match(/Day (\d+)/)?.[1]);
  await button("Advance one day").click();
  await expect(day).toContainText(`Day ${previous + 1}`);
  await page.keyboard.press("2");
  await button("Bless harvest").click();
  await expect(page.getByText("A blessing filled the granaries.").first()).toBeVisible();
  await page.reload();
  await button("Enter world").click();
  await expect(day).toContainText(`Day ${previous + 1}`);
  await button("Powers").click();
  await expect(page.getByText("A blessing filled the granaries.").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
