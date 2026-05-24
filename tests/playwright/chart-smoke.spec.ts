import { expect, test } from "@playwright/test";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

test("stock chart renders and remains bounded after wheel gestures", async ({
  page,
}) => {
  const consoleMessages: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    consoleMessages.push(`pageerror: ${error.message}`);
  });

  await page.goto(`${baseUrl}/stocks/AAPL`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const chart = page.locator('[aria-label="AAPL 가격 차트"]');
  await expect(chart).toBeVisible();
  await expect(chart).toContainText("DB");
  await expect(chart).toContainText("VIEW");

  const canvas = chart.locator("canvas").first();
  await expect(canvas).toBeVisible();
  const before = await canvas.boundingBox();
  expect(before?.width ?? 0).toBeGreaterThan(300);
  expect(before?.height ?? 0).toBeGreaterThan(200);

  for (let i = 0; i < 12; i += 1) {
    await page.mouse.move(
      (before?.x ?? 0) + Math.min(420, (before?.width ?? 0) - 12),
      (before?.y ?? 0) + Math.min(220, (before?.height ?? 0) - 12),
    );
    await page.mouse.wheel(0, 900);
  }
  for (let i = 0; i < 8; i += 1) {
    await page.mouse.move(
      (before?.x ?? 0) + Math.min(420, (before?.width ?? 0) - 12),
      (before?.y ?? 0) + Math.min(220, (before?.height ?? 0) - 12),
    );
    await page.mouse.wheel(700, 0);
  }
  await page.waitForTimeout(1200);

  const after = await canvas.boundingBox();
  expect(after?.width ?? 0).toBeGreaterThan(300);
  expect(after?.height ?? 0).toBeGreaterThan(200);
  await expect(chart).toContainText("DB");
  await expect(chart).toContainText("VIEW");

  const severeMessages = consoleMessages.filter(
    (message) =>
      !message.includes("Download the React DevTools") &&
      !message.includes("DeprecationWarning"),
  );
  expect(severeMessages).toEqual([]);
});

test("home market comparison chart renders five-year API comparison", async ({
  page,
}) => {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  await expect(page.getByText("시장 누적 수익률")).toBeVisible();
  await expect(page.getByRole("button", { name: "5Y" })).toBeVisible();
  await expect(page.getByText("API").first()).toBeVisible();
  await expect(page.getByText("VIEW ALL")).toBeVisible();
});

test("analysis page renders kline series chart surfaces", async ({ page }) => {
  await page.goto(`${baseUrl}/analysis`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  await expect(page.getByPlaceholder(/종목 검색/)).toBeVisible();
  await expect(page.getByRole("button", { name: "시장 개요" })).toBeVisible();
  await page.getByRole("button", { name: "수익률 비교" }).click();

  const chart = page.getByLabel("시계열 비교 차트").first();
  await expect(chart).toBeVisible();
  await expect(chart).toContainText(/API|DB|VIEW|points|데이터 없음/);
});

test("stocks page renders mini kline chart column or clear empty state", async ({
  page,
}) => {
  await page.goto(`${baseUrl}/stocks`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  await expect(page.getByRole("heading", { name: "종목 검색" })).toBeVisible();
  await expect(page.getByText("실가격 스파크라인")).toBeVisible();

  const miniCharts = page.locator('[aria-roledescription="미니 시계열 차트"]');
  const emptyState = page.getByText("표시할 종목 데이터가 없습니다");

  if ((await miniCharts.count()) > 0) {
    await expect(miniCharts.first()).toBeVisible();
    await expect(miniCharts.first().locator("canvas").first()).toBeVisible();
  } else {
    await expect(emptyState).toBeVisible();
  }
});
