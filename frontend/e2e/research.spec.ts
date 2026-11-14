import { test, expect } from "@playwright/test";

test("verified hosted Python recording renders code and real fuel medians offline", async ({
  page,
  request,
}) => {
  const recordings = await (await request.get("/api/replays")).json();
  test.skip(
    !recordings.some((r: any) => r.replay_id === "live-lab"),
    "Requires a previously verified real hosted Lab recording",
  );
  await page.goto("/s/replay:live-lab");
  await expect(page.locator(".recorded-banner")).toBeVisible();
  await expect(page.locator(".research-panel")).toContainText("methanol", {
    timeout: 20000,
  });
  await expect(page.locator(".research-panel pre").first()).toBeVisible();
  await expect(page.locator(".research-panel .si-badge").first()).toBeVisible();
  await page.screenshot({
    path: "../build/eval/screens/recorded-lab.png",
    fullPage: true,
  });
});

test("workspace loads and offers real data tools without a key", async ({
  page,
}) => {
  await page.goto("/workspace");
  await expect(
    page.getByRole("heading", { name: /Ask the evidence/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Explore data/ }).click();
  await expect(
    page.getByRole("menuitem", { name: /Datasets/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "../build/eval/screens/workspace.png",
    fullPage: true,
  });
});
test("investigation discovery opens NASA objectives and normalized variables", async ({
  page,
}) => {
  await page.goto("/investigations");
  await page.getByLabel("Search investigations").fill("FLEX");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .locator(".investigation-card")
    .filter({ has: page.getByRole("heading", { name: "FLEX", exact: true }) })
    .click();
  await expect(
    page.getByRole("heading", { name: "Research objectives" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Variables", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "o2_mole_fraction", exact: true }),
  ).toBeVisible();
  await page
    .getByText("Trace variable summaries to source rows", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Trace total_pressure", exact: true })
    .click();
  await expect(page.locator(".evidence-inspector")).toContainText("SHA-256");
});
test("dataset raw toggle, source measurements, chart and export", async ({
  page,
}) => {
  await page.goto("/data/PSI-69:flex_experimental");
  await expect(
    page.getByRole("heading", { name: "FLEX droplet combustion results" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Raw cells", exact: true }).click();
  await expect(
    page.getByRole("columnheader", { name: "Burning rate; mm" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Normalized", exact: true }).click();
  await page.getByRole("button", { name: "Build chart", exact: true }).click();
  await expect(page.locator('[data-chart-ready="true"]')).toBeVisible({
    timeout: 20000,
  });
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toContain(".csv");
  await page.screenshot({
    path: "../build/eval/screens/dataset.png",
    fullPage: true,
  });
});
test("habitat envelope distinguishes atmosphere from gravity coverage", async ({
  page,
}) => {
  await page.goto("/envelope");
  await page.getByRole("button", { name: "Explore coverage" }).click();
  await expect(page.locator(".artifact-view")).toContainText("FLEX");
  await expect(page.locator(".headline-finding")).toContainText(
    "Liquid droplets",
  );
  await expect(page.locator(".artifact-view")).toContainText(
    "no partial-gravity",
  );
  await expect(page.locator(".artifact-view")).not.toContainText('{"n"');
  await expect(page.locator('[data-chart-ready="true"]')).toBeVisible({
    timeout: 20000,
  });
  await page.screenshot({
    path: "../build/eval/screens/envelope.png",
    fullPage: true,
  });
});
test("evidence map shows tested and untested conditions", async ({ page }) => {
  await page.goto("/evidence-map");
  await expect(page.locator(".findings")).toContainText(
    "Lunar habitat reference cell",
  );
  await expect(page.locator(".gap-table").first()).toBeVisible();
  await expect(page.locator("main")).toContainText("burner-stream oxygen");
  await page.screenshot({
    path: "../build/eval/screens/evidence-map.png",
    fullPage: true,
  });
});
test("fire-safety systems view groups evidence and shows suppression data", async ({
  page,
}) => {
  await page.goto("/systems");
  await expect(page.locator(".system-column")).toHaveCount(3);
  await expect(page.locator(".system-column").nth(1)).toContainText("SAME-R");
  await page
    .getByRole("button", { name: "Show FLEX dilution evidence" })
    .click();
  await expect(page.locator(".artifact-view")).toContainText(
    "Recorded outcomes by diluent level",
  );
  await expect(page.locator('[data-chart-ready="true"]')).toBeVisible({
    timeout: 20000,
  });
  await page.screenshot({
    path: "../build/eval/screens/systems.png",
    fullPage: true,
  });
});
test("unrelated search says so instead of ranking noise", async ({ page }) => {
  await page.goto("/investigations");
  await page.getByLabel("Search investigations").fill("asdfqwer zzzz");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".empty-note")).toBeVisible();
  await expect(page.locator(".investigation-card")).toHaveCount(0);
});
test("comparison displays named confounders", async ({ page }) => {
  await page.goto("/compare");
  await page
    .getByRole("button", { name: "Compare source measurements" })
    .click();
  await expect(page.locator(".artifact-view")).toContainText(
    "comparable with caveats",
  );
  await expect(page.locator(".checklist")).toContainText("Confounded:");
  await expect(page.locator(".checklist")).toContainText("total_pressure");
  await expect(page.locator('[data-chart-ready="true"]')).toBeVisible({
    timeout: 20000,
  });
  await page.screenshot({
    path: "../build/eval/screens/compare.png",
    fullPage: true,
  });
});
test("recorded demonstration renders citations and opens real source evidence", async ({
  page,
}) => {
  await page.goto("/featured");
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", {
        name: "An atmosphere is not a gravity regime",
      }),
    })
    .click();
  await expect(page.locator(".recorded-banner")).toBeVisible();
  await expect(page.locator(".citation").first()).toBeVisible();
  await page.locator(".citation").first().click();
  await expect(page.locator(".evidence-inspector")).toContainText("SHA-256");
  await page.screenshot({
    path: "../build/eval/screens/research-evidence.png",
    fullPage: true,
  });
});
test("original NASA video supports browser byte ranges", async ({
  page,
  request,
}) => {
  await page.goto("/media");
  await expect(page.locator("video").first()).toBeVisible();
  const src = await page.locator("video").first().getAttribute("src");
  const response = await request.get(src!, {
    headers: { Range: "bytes=0-1023" },
  });
  expect(response.status()).toBe(206);
  expect((await response.body()).byteLength).toBe(1024);
});
test("disclosures are readable on desktop and mobile", async ({ page }) => {
  await page.goto("/about");
  await expect(
    page.getByRole("heading", { name: "SI usage disclosure" }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText(
    "Microgravity results are not measurements at lunar or Martian gravity.",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace");
  await expect(
    page.getByLabel("Research question", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../build/eval/screens/mobile.png",
    fullPage: true,
  });
});

test("cinematic intro can be skipped, replayed and never traps the visitor", async ({
  page,
}) => {
  await page.goto("/research-overview");
  const intro = page.getByRole("dialog", { name: "EmberNova introduction" });
  await expect(intro).toBeVisible();
  await expect(page.getByRole("button", { name: /Skip intro/ })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(intro).toContainText("80,000 miles");
  await expect(intro).toContainText("Aerospace America");
  await page.keyboard.press("Escape");
  await expect(intro).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /In orbit, fire/ }),
  ).toBeVisible();
  // The intro plays automatically only once per browser.
  await page.reload();
  await expect(intro).toHaveCount(0);
  await page.getByRole("button", { name: /Replay intro/ }).click();
  await expect(intro).toBeVisible();
  await page.getByRole("button", { name: /Skip intro/ }).click();
  await expect(intro).toHaveCount(0);
  await page.screenshot({ path: "../build/eval/screens/home.png" });
});
test("home question opens the workspace with the question prefilled", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("embernova-intro-seen", "1"),
  );
  await page.goto("/research-overview");
  await page.locator("#begin-q").fill("flame spread over fabrics");
  await page.getByRole("button", { name: /Open in workspace/ }).click();
  await expect(page).toHaveURL(/\/workspace/);
  await expect(page.getByLabel("Research question", { exact: true })).toHaveValue(
    "flame spread over fabrics",
  );
});
test("capabilities page links every capability to a working route", async ({
  page,
}) => {
  await page.goto("/capabilities");
  await expect(page.locator(".cap-card").first()).toBeVisible();
  const links = await page.locator(".cap-card a").evaluateAll((as) =>
    as.map((a) => a.getAttribute("href")),
  );
  expect(links.length).toBeGreaterThan(10);
  for (const href of new Set(links)) {
    await page.goto(href!);
    await expect(page.locator(".not-found")).toHaveCount(0);
  }
});
