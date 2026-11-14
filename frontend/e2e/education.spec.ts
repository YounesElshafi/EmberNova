import { test, expect } from "@playwright/test";
test("three audiences and learning experiment work", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("embernova-intro-seen", "1"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /In orbit, fire/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .getByRole("link", { name: "Learn", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .getByRole("link", { name: "Play", exact: true }),
  ).toBeVisible();
  await page.goto("/learn/lab");
  await page.getByLabel("Your prediction").selectOption("round");
  await page.getByRole("button", { name: "Run conceptual experiment" }).click();
  await expect(page.getByRole("status")).toContainText("matches");
  await page
    .getByRole("combobox", { name: "Gravity", exact: true })
    .selectOption("earth");
  await expect(page.getByText("AWAITING YOUR HYPOTHESIS")).toBeVisible();
  await page.getByLabel("Your prediction").selectOption("tall");
  await page.getByRole("button", { name: "Run conceptual experiment" }).click();
  await expect(page.getByRole("status")).toContainText("Buoyancy");
  await page.screenshot({
    path: "../build/eval/screens/learning-lab.png",
    fullPage: true,
  });
});
test("guest can complete all five academy missions and persist progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/kids");
  for (const name of ["Fuel", "Oxygen", "Heat"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Test combination" }).click();
  await expect(
    page.getByRole("heading", { name: "Discovery unlocked!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Launch next mission" }).click();
  await page.getByRole("button", { name: /Gravity:/ }).click();
  await page
    .getByRole("button", { name: "Record rounded flame discovery" })
    .click();
  await page.getByRole("button", { name: "Launch next mission" }).click();
  await page.getByRole("button", { name: "Open ventilation gate" }).click();
  await page.getByRole("button", { name: "Deliver parcel & explain" }).click();
  await page.getByRole("button", { name: "Launch next mission" }).click();
  for (const name of ["Blocked vent", "Covered detector", "Loose supplies"])
    await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.getByRole("button", { name: "Check station" }).click();
  await page.getByRole("button", { name: "Launch next mission" }).click();
  await page
    .getByRole("button", { name: "Quiet droplet flames can be rounded" })
    .click();
  await page
    .getByRole("button", { name: "Airflow can carry oxygen and smoke" })
    .click();
  await page.getByRole("button", { name: "Submit science report" }).click();
  await expect(
    page.getByRole("heading", { name: "Junior Space Scientist" }),
  ).toBeVisible();
  await page.screenshot({
    path: "../build/eval/screens/academy-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByText("5 DISCOVERY BADGES")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
