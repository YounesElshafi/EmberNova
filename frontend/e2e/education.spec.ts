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
