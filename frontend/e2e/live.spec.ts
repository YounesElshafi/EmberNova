import { test, expect } from "@playwright/test";

test("live research streams through the real frontend and persists citations", async ({
  page,
}) => {
  test.skip(
    process.env.EMBERNOVA_LIVE_E2E !== "1",
    "Explicit live verification only; normal tests make no provider calls.",
  );
  test.setTimeout(180000);
  await page.goto("/workspace");
  await page
    .getByLabel("Research question", { exact: true })
    .fill(
      "What was the visible flame extinction diameter in FLEX test 20CAL10? Retrieve the measured source row, cite it, and keep the answer brief.",
    );
  await page.getByRole("button", { name: "Send research question" }).click();
  await expect(page.locator(".assistant-message")).toContainText("0.94", {
    timeout: 140000,
  });
  await expect(page.locator(".citation").first()).toBeVisible();
  await page.locator(".citation").first().click();
  await expect(page.locator(".evidence-inspector")).toContainText("SHA-256");
  await page.screenshot({
    path: "../build/eval/screens/live-chat.png",
    fullPage: true,
  });
  const thread = page.url();
  await page.reload();
  await expect(page.locator(".assistant-message")).toContainText("0.94");
  expect(page.url()).toBe(thread);
});

test("live habitat research produces a source-backed measured chart in the workspace", async ({
  page,
}) => {
  test.skip(
    process.env.EMBERNOVA_LIVE_E2E !== "1",
    "Explicit live verification only",
  );
  test.setTimeout(240000);
  await page.goto("/workspace");
  await page
    .getByLabel("Research question", { exact: true })
    .fill(
      "Search NASA investigations and report evidence for oxygen and flame extinction relevant to lunar habitats. Query FLEX tests between 30–34% oxygen and 520–560 mmHg. Chart burning_rate_constant versus o2_mole_fraction using those same filtered rows, title FLEX oxygen and burning rate. Check applicability for lunar gravity. Cite the original NASA report and source rows, distinguish evidence from interpretation, then answer briefly.",
    );
  await page.getByRole("button", { name: "Send research question" }).click();
  await expect(page.locator(".tool-activity")).toContainText(
    "Research complete",
    { timeout: 140000 },
  );
  await expect(page.locator(".assistant-message").last()).toContainText("17");
  const sessionId = page.url().split("/s/")[1];
  const session = await (
    await page.request.get(`/api/sessions/${sessionId}`)
  ).json();
  const turn = session.turns.at(-1);
  expect(turn.answer.audit.invalid_citations).toBe(0);
  const artifacts = await Promise.all(
    turn.artifacts.map(async (id: string) =>
      (await page.request.get(`/api/artifacts/${id}`)).json(),
    ),
  );
  const chart = artifacts.find(
    (a) =>
      a.type === "chart" && a.payload.chart.y.field === "burning_rate_constant",
  );
  expect(chart).toBeTruthy();
  const measurements = await (
    await page.request.post("/api/measurements/query", {
      data: {
        table_ids: ["PSI-69:flex_experimental"],
        quantities: ["burning_rate_constant"],
        filters: [
          {
            field: "o2_mole_fraction",
            op: "between",
            values: [30, 34],
            unit: "percent",
          },
          {
            field: "total_pressure",
            op: "between",
            values: [520, 560],
            unit: "mmHg",
          },
        ],
      },
    })
  ).json();
  expect(measurements.total).toBe(17);
  // One matching NASA row lacks K. It must not become a fabricated chart point.
  const expectedRuns = measurements.rows
    .filter((r: any) => r.burning_rate_constant !== null)
    .map((r: any) => r.run_uid)
    .sort();
  expect(expectedRuns).toHaveLength(16);
  expect(
    chart.payload.chart.series.flatMap((s: any) => s.points.run_uid).sort(),
  ).toEqual(expectedRuns);
  // Since the cinematic redesign (ADR-015) charts render inline in the thread, labeled by title.
  const inlineChart = page
    .locator(`.inline-block[aria-label=${JSON.stringify(chart.title)}]`)
    .first();
  await inlineChart.scrollIntoViewIfNeeded();
  await expect(inlineChart.locator('[data-chart-ready="true"]')).toBeVisible({
    timeout: 30000,
  });
  await page.screenshot({
    path: "../build/eval/screens/live-habitat-chart.png",
    fullPage: true,
  });
});

test("live ranking renders inline cards with NASA links and resolves 'the first two'", async ({
  page,
}) => {
  test.skip(
    process.env.EMBERNOVA_LIVE_E2E !== "1",
    "Explicit live verification only",
  );
  test.setTimeout(300000);
  await page.goto("/workspace");
  const box = page.getByLabel("Research question", { exact: true });
  await box.fill("Show me the most relevant studies about flame extinction.");
  await page.getByRole("button", { name: "Send research question" }).click();
  const ranking = page
    .locator(".inline-block.kind-investigation_ranking")
    .first();
  await expect(ranking).toBeVisible({ timeout: 150000 });
  await expect(ranking).toContainText("Scientific relevance");
  await expect(ranking).toContainText("Not a probability");
  const firstLink = ranking.locator(".source-links a").first();
  await expect(firstLink).toHaveAttribute(
    "href",
    /^https:\/\/(psi\.nasa\.gov|www\.nasa\.gov|ntrs\.nasa\.gov|science\.nasa\.gov|doi\.org)\//,
  );
  await expect(firstLink).toHaveAttribute("target", "_blank");
  const acronyms = await ranking
    .locator(".ranking-card .ranking-head b")
    .allTextContents();
  await expect(
    page.getByRole("button", { name: "Send research question" }),
  ).toBeVisible({ timeout: 150000 });
  await page.screenshot({
    path: "../build/eval/screens/live-ranking.png",
    fullPage: true,
  });
  await box.fill("Compare the first two.");
  await page.getByRole("button", { name: "Send research question" }).click();
  const second = page.locator(".assistant-message").nth(1);
  await expect(second).toContainText(acronyms[0].split(/[ /]/)[0], {
    timeout: 150000,
  });
  await expect(second).toContainText(acronyms[1].split(/[ /]/)[0]);
  await page.reload();
  await expect(
    page.locator(".inline-block.kind-investigation_ranking").first(),
  ).toBeVisible();
});

test("live lunar habitat question shows an evidence classification and gaps", async ({
  page,
}) => {
  test.skip(
    process.env.EMBERNOVA_LIVE_E2E !== "1",
    "Explicit live verification only",
  );
  test.setTimeout(200000);
  await page.goto("/workspace");
  await page
    .getByLabel("Research question", { exact: true })
    .fill(
      "Could acrylic materials create a fire hazard in a lunar habitat under elevated oxygen conditions?",
    );
  await page.getByRole("button", { name: "Send research question" }).click();
  const block = page.locator(".inline-block.kind-evidence_assessment").first();
  await expect(block).toBeVisible({ timeout: 170000 });
  await expect(block.locator(".evidence-class")).toContainText(
    /Indirect evidence|Insufficient evidence/,
  );
  await expect(block.locator(".gap-box")).toContainText("lunar");
  await expect(block).not.toContainText("Direct experimental evidence");
  await expect(page.locator("body")).not.toContainText(
    /\d+\s?% (chance|probability|risk)/i,
  );
  await page.screenshot({
    path: "../build/eval/screens/live-lunar.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(392);
  await page.screenshot({
    path: "../build/eval/screens/live-lunar-mobile.png",
    fullPage: true,
  });
});
