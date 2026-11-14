import { test, expect } from "@playwright/test";
const routes = ["/", "/workspace", "/investigations", "/data/PSI-69:flex_experimental", "/systems", "/evidence-map", "/compare", "/envelope", "/media", "/featured", "/capabilities", "/how-it-works", "/about"];
for (const width of [1440, 768, 390]) {
  test(`observatory routes fit ${width}px and load without application errors`, async ({ page }) => {
    test.setTimeout(180000);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const [index, route] of routes.entries()) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1").first()).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), { message: `${route} overflows at ${width}` }).toBe(true);
      if (route === "/") await expect(page.locator(".mission-image img")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `../build/eval/screens/observatory-${width}-${index}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
test("new landing sends a question and loads original NASA imagery", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".mission-image img")).toBeVisible();
  await expect.poll(() => page.locator(".mission-image img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await page.locator("#begin-q").fill("How does oxygen affect extinction?");
  await page.getByRole("button", { name: "Open in workspace", exact: true }).click();
  await expect(page.getByLabel("Research question", { exact: true })).toHaveValue("How does oxygen affect extinction?");
});

test("landing keyboard entry, reduced motion and deferred cinematic loading", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const failed: string[] = [];
  page.on("response", response => { if (response.url().includes("/assets/") && response.status() >= 400) failed.push(response.url()); });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await expect(page.locator(".mission-image img")).toBeVisible();
  expect(await page.evaluate(() => performance.getEntriesByType("resource").some(r => /CinematicIntro|spaceScene|plotly-cartesian/.test(r.name)))).toBe(false);
  expect(failed).toEqual([]);
  const headingTop = await page.locator("h1").evaluate(el => el.getBoundingClientRect().top);
  expect(headingTop).toBeGreaterThan(76);
});
