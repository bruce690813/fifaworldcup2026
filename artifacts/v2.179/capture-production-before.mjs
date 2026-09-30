import { chromium } from "@playwright/test";

const browser = await chromium.launch();
for (const viewport of [{width:1366,height:768},{width:390,height:844}]) {
  const page = await browser.newPage({ viewport, locale:"zh-TW" });
  await page.goto("https://bruce690813.github.io/fifaworldcup2026/", { waitUntil:"domcontentloaded", timeout:60_000 });
  await page.evaluate(() => document.getElementById("competitionGuideBtn")?.click());
  await page.locator("#competitionGuideModal.open").waitFor();
  await page.locator(".competition-guide-dialog").screenshot({ path:`artifacts/v2.179/before-season-guide-${viewport.width}x${viewport.height}.png` });
  await page.close();
}
await browser.close();
