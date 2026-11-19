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
  await expect(button("Play")).toHaveCSS("font-family", /Geist Variable/);
  await photograph(page, "main-menu");
  await button("How to play").click();
  const guide = page.getByRole("dialog");
  await expect(guide).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  expect(await page.evaluate(() => Array.from(document.fonts).some(
    font => font.family.includes("Geist Variable") && font.status === "loaded"
  ))).toBe(true);
  for (const element of [page.locator("h1").first(), guide.getByRole("heading").first(), guide.locator("kbd").first()]) {
    await expect(element).toHaveCSS("font-family", /Geist Variable/);
  }
  await page.keyboard.press("Escape");
  await expect(guide).toHaveCount(0);
  await button("Play").click();
  await photograph(page, "world-overview");
  await button("Pause time").click();
  await button("Powers").click();
  await button("Send rain").click();
  await expect(page.getByText("Rain soaked the fields.", {exact: false}).first()).toBeVisible();
  await expect(page.getByRole("img", {name:/Rain falls on the village\.$/})).toBeVisible();
  await photograph(page, "god-powers");
  for (let day = 0; day < 5; day++) await button("Advance one day").click();
  await expect(page.getByRole("img", {name:/Rain falls on the village\.$/})).toHaveCount(0, {timeout: 20_000});
  await button("Village").click();
  await expect(page.getByRole("heading", {name:"Population by day"})).toBeVisible();
  await page.getByRole("button", {name:/^Water/}).click();
  await expect(page.getByRole("heading", {name:"Water by day"})).toBeVisible();
  await expect(page.getByRole("slider", {name:"Day on chart"})).toBeVisible();
  await photograph(page, "civilization-dashboard");
  await button("Timelines").click();
  await button("Start a branch").click();
  await button("Storm").click();
  await button("Run one week").click();
  await expect(page.getByRole("heading", {name:"After one week"})).toBeVisible();
  const pop = page.getByRole("row", {name:/Population/}).getByRole("cell");
  expect(parseInt(await pop.nth(0).innerText())).toBeGreaterThan(parseInt(await pop.nth(1).innerText()));
  await expect(page.getByRole("combobox")).toHaveCSS("font-family", /Geist Variable/);
  await photograph(page, "timeline-comparison");
  expect(errors).toEqual([]);
});

test("controls and saved progress work on a phone-sized viewport", async ({page}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const button = (name: string) => page.getByRole("button", {name, exact: true});
  await button("Play").click({timeout: 60_000});
  await button("Pause time").click();
  const day = page.locator(".map-status");
  const previous = Number((await day.innerText()).match(/Day (\d+)/)?.[1]);
  await button("Advance one day").click();
  await expect(day).toContainText(`Day ${previous + 1}`);
  await page.keyboard.press("2");
  await button("Bless the harvest").click();
  await expect(page.getByText("The wheat came in early.").first()).toBeVisible();
  await page.reload();
  await button("Play").click();
  await expect(day).toContainText(`Day ${previous + 1}`);
  await button("Powers").click();
  await expect(page.getByText("The wheat came in early.").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
