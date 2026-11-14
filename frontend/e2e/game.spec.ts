import { test, expect, type Page } from "@playwright/test";
test.use({ hasTouch: true });
async function useObject(page: Page, id: string) {
  const world = page.locator(".game-render");
  await expect
    .poll(async () =>
      JSON.parse((await world.getAttribute("data-targets")) ?? "[]").some(
        (t: { id: string }) => t.id === id,
      ),
    )
    .toBe(true);
  const target = (
    JSON.parse((await world.getAttribute("data-targets"))!) as {
      id: string;
      x: number;
      y: number;
    }[]
  ).find((t) => t.id === id)!;
  const box = (await world.boundingBox())!;
  await page.mouse.click(box.x + target.x, box.y + target.y);
}
async function cross(page: Page, n: number) {
  await useObject(page, "door" + n);
  await expect(page.locator(".game-render")).toHaveAttribute(
    "data-room",
    String(n + 1),
    { timeout: 15000 },
  );
}
test("astronaut explores and completes five real-time station puzzles", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("fonts.googleapis.com"))
      errors.push(msg.text());
  });
  page.on("requestfailed", (request) => {
    if (!request.url().startsWith("https://fonts.googleapis.com/"))
      errors.push(request.url() + ": " + request.failure()?.errorText);
  });
  await page.goto("/kids");
  await page.getByRole("button", { name: "Launch adventure" }).click();
  const world = page.locator(".game-render");
  await expect(world.locator("canvas")).toBeVisible();
  await world.locator("canvas").focus();
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(450);
  await page.keyboard.up("KeyD");
  expect(Number(await world.getAttribute("data-x"))).toBeGreaterThan(-2);
  await useObject(page, "console");
  await expect(world).toHaveAttribute("data-unlocked", "1");
  await cross(page, 0);
  for (const [index, id] of ["fuel", "oxygen", "heat"].entries()) {
    await useObject(page, id);
    await expect(page.getByText(`Carrying ${id} capsule`)).toBeVisible({
      timeout: 12000,
    });
    await useObject(page, "chamber");
    await expect(world).toHaveAttribute("data-loaded", String(index + 1), {
      timeout: 12000,
    });
  }
  await page.screenshot({ path: "../build/eval/screens/game-combustion.png" });
  await cross(page, 1);
  await useObject(page, "gravity");
  await expect(page.getByRole("status")).toContainText("round out", {
    timeout: 12000,
  });
  await page.screenshot({ path: "../build/eval/screens/game-zero-g.png" });
  await useObject(page, "gravity");
  await expect(world).toHaveAttribute("data-unlocked", "3");
  await cross(page, 2);
  for (const [index, id] of ["fan0", "fan1", "fan2"].entries()) {
    for (let n = 0; n < 4; n++) {
      const before = JSON.parse((await world.getAttribute("data-fans"))!);
      if (before[index] === 0) break;
      await useObject(page, id);
      await expect
        .poll(
          async () =>
            JSON.parse((await world.getAttribute("data-fans"))!)[index],
          { timeout: 10000 },
        )
        .toBe((before[index] + 1) % 4);
    }
  }
  await expect(world).toHaveAttribute("data-unlocked", "4");
  await cross(page, 3);
  await useObject(page, "vent");
  await expect(page.getByRole("status")).toContainText("cleared", {
    timeout: 12000,
  });
  await useObject(page, "sensor");
  await expect(page.getByRole("status")).toContainText("inspected", {
    timeout: 12000,
  });
  await useObject(page, "beacon");
  await expect(
    page.getByRole("heading", { name: "Explorer wings earned!" }),
  ).toBeVisible({ timeout: 12000 });
  await page.screenshot({ path: "../build/eval/screens/game-victory.png" });
  expect(errors).toEqual([]);
  await page.reload();
  await page.getByRole("button", { name: "Launch adventure" }).click();
  await expect(world).toHaveAttribute("data-room", "4");
});
test("touch controller moves astronaut, interacts and releases on pause", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kids");
  await page.getByRole("button", { name: "Launch adventure" }).click();
  const w = page.locator(".game-render");
  await expect(w.locator("canvas")).toBeVisible();
  const right = page.getByRole("button", { name: "→", exact: true });
  const box = (await right.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1000);
  await page.mouse.up();
  expect(Number(await w.getAttribute("data-x"))).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Interact", exact: true }).click();
  await expect(w).toHaveAttribute("data-unlocked", "1");
  await page.getByRole("button", { name: "Sound off" }).click();
  await expect(page.getByRole("button", { name: "Sound on" })).toBeVisible();
  await page.screenshot({
    path: "../build/eval/screens/game-mobile-playing.png",
  });
  console.log("Mobile game FPS:", await w.getAttribute("data-fps"));
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Flight paused" }),
  ).toBeVisible();
  await page.screenshot({ path: "../build/eval/screens/game-mobile.png" });
  await page.getByRole("button", { name: "Restart from docking bay" }).click();
  await expect(w).toHaveAttribute("data-unlocked", "0");
  await expect(
    page.getByRole("heading", { name: "Flight paused" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
