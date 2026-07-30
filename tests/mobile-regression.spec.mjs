import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const leafletScript = readFileSync(
  new URL("../node_modules/leaflet/dist/leaflet.js", import.meta.url)
);
const leafletStyles = readFileSync(
  new URL("../node_modules/leaflet/dist/leaflet.css", import.meta.url)
);

const mlsTeamsFixture = JSON.parse(
  readFileSync(new URL("./fixtures/espn-mls-teams.json", import.meta.url), "utf8")
);
const mlsRosterFixture = JSON.parse(
  readFileSync(new URL("./fixtures/espn-mls-roster.json", import.meta.url), "utf8")
);

const SOUTH_AMERICA_TEAMS = [
  "阿根廷",
  "烏拉圭",
  "巴拉圭",
  "厄瓜多",
  "哥倫比亞",
  "巴西"
];

const WORLD_CUP_FINALISTS = [
  "德國",
  "阿根廷",
  "巴西",
  "義大利",
  "法國",
  "荷蘭",
  "西班牙",
  "烏拉圭",
  "匈牙利",
  "捷克斯洛伐克",
  "英格蘭",
  "瑞典",
  "克羅埃西亞"
];

async function openMobileFeature(page, targetId, targetSelector) {
  const menuButton = page.locator("#mobileFeatureMenuBtn");
  await menuButton.click();

  const menu = page.locator("#mobileFeatureMenu");
  await expect(menu).toHaveClass(/open/);

  const featureButton = menu.locator(`[data-mobile-nav-target="${targetId}"]`);
  await expect(featureButton).toBeVisible();
  await featureButton.click();

  const target = page.locator(targetSelector);
  await expect(target).toBeVisible();
  return target;
}

async function expectMinimumTouchTarget(locator, name) {
  await expect(locator, `${name} 應顯示於手機畫面`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${name} 應有可量測的觸控範圍`).not.toBeNull();
  expect(box.width, `${name} 寬度應至少 44px`).toBeGreaterThanOrEqual(44);
  expect(box.height, `${name} 高度應至少 44px`).toBeGreaterThanOrEqual(44);
}

test.beforeEach(async ({ page }) => {
  await page.route(
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
    route => route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      body: leafletScript
    })
  );
  await page.route(
    "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
    route => route.fulfill({
      status: 200,
      contentType: "text/css; charset=utf-8",
      body: leafletStyles
    })
  );
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".version-badge")).toBeVisible();
});

test("手機控制與輔助文字符合最小可讀／可觸控尺寸", async ({ page }) => {
  const controls = [
    ["#groupFilter", "組別篩選"],
    ["#continentFilter", "洲別篩選"],
    ["#searchBox", "智慧搜尋"],
    ["#smartSearchHelpBtn", "搜尋說明"],
    ["#mobileMapFullscreenBtn", "地圖全螢幕"]
  ];

  for (const [selector, name] of controls) {
    await expectMinimumTouchTarget(page.locator(selector), name);
  }

  await page.locator("#mobileFeatureMenuBtn").click();
  await expectMinimumTouchTarget(
    page.locator("#mobileFeatureMenuCloseBtn"),
    "全部功能關閉按鈕"
  );

  const smallText = page.locator([
    ".mobile-feature-group-heading small",
    ".mobile-feature-item-copy small",
    ".mobile-map-controls-copy small"
  ].join(","));
  await expect(smallText.first()).toBeVisible();

  const smallestFontSize = await smallText.evaluateAll(nodes =>
    Math.min(...nodes.map(node => Number.parseFloat(getComputedStyle(node).fontSize)))
  );
  expect(smallestFontSize, "手機輔助文字應至少 12px").toBeGreaterThanOrEqual(12);
});

test("賽事指南使用共用彈窗且只有一個垂直捲動區", async ({ page }) => {
  const modal = await openMobileFeature(
    page,
    "competitionGuideBtn",
    "#competitionGuideModal[data-ui-modal]"
  );
  await expect(modal).toHaveAttribute("aria-hidden", "false");

  const declaredScrollRegion = modal.locator("[data-modal-scroll]");
  await expect(
    declaredScrollRegion,
    "每個共用彈窗只能宣告一個內容捲動區"
  ).toHaveCount(1);

  const actualScrollableCount = await modal.evaluate(root => {
    return [root, ...root.querySelectorAll("*")].filter(element => {
      if (!(element instanceof HTMLElement)) return false;
      const overflowY = getComputedStyle(element).overflowY;
      return ["auto", "scroll"].includes(overflowY)
        && element.scrollHeight > element.clientHeight + 1;
    }).length;
  });
  expect(actualScrollableCount, "彈窗內實際可垂直捲動區應只有一個").toBe(1);

  await declaredScrollRegion.evaluate(element => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.locator("#competitionGuideTitle")).toBeInViewport();
  await expect(page.locator("#closeCompetitionGuideBtn")).toBeInViewport();

  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(page.locator("#mobileFeatureMenuBtn")).toBeFocused();
});

test("南美洲篩選完整顯示六支球隊標籤", async ({ page }) => {
  await expect(page.locator("#map.leaflet-container")).toBeVisible({
    timeout: 30_000
  });

  await page.locator("#continentFilter").selectOption("南美洲");
  await expect(page.locator("#countLabel")).toHaveText("6 隊");

  const labels = page.locator(
    "#map .leaflet-marker-pane .group-label-marker .marker-label"
  );
  await expect(labels).toHaveCount(6);

  await expect.poll(async () => {
    const names = await labels.allTextContents();
    return names.map(name => name.replace(/\s*⭐+/g, "").trim()).sort();
  }).toEqual([...SOUTH_AMERICA_TEAMS].sort());

  await expect.poll(async () => labels.evaluateAll(nodes => {
    const map = document.querySelector("#map");
    if (!(map instanceof HTMLElement)) return false;
    const mapRect = map.getBoundingClientRect();
    return nodes.every(node => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0
        && rect.height > 0
        && style.visibility !== "hidden"
        && style.display !== "none"
        && rect.left >= mapRect.left - 1
        && rect.right <= mapRect.right + 1
        && rect.top >= mapRect.top - 1
        && rect.bottom <= mapRect.bottom + 1;
    });
  })).toBe(true);
});

test("FIFA 會員名錄只在首次開啟時延遲產生", async ({ page }) => {
  const cards = page.locator(
    "#fifaMemberDirectoryGrid .fifa-member-directory-card"
  );
  const logos = page.locator(
    "#fifaMemberDirectoryGrid img[data-association-logo]"
  );

  await expect(cards, "尚未開啟名錄時不應建立 211 張卡片").toHaveCount(0);
  await expect(logos, "尚未開啟名錄時不應建立協會圖片").toHaveCount(0);

  const modal = await openMobileFeature(
    page,
    "fifaMembersBtn",
    "#fifaMembersModal[data-ui-modal]"
  );
  await expect(modal.locator("[data-modal-scroll]")).toHaveCount(1);
  await expect(cards).toHaveCount(211);

  await page.locator("#closeFifaMembersBtn").click();
  await expect(modal).toBeHidden();

  await openMobileFeature(
    page,
    "fifaMembersBtn",
    "#fifaMembersModal[data-ui-modal]"
  );
  await expect(cards, "重新開啟不應重複建立名錄卡片").toHaveCount(211);
});

test("決賽排行包含所有 13 個曾晉級決賽國家", async ({ page }) => {
  const dialog = await openMobileFeature(
    page,
    "finalsRankingBtn",
    "#finalsRankingDialog"
  );
  const cards = dialog.locator(".finals-ranking-card");
  await expect(cards).toHaveCount(13);

  const names = await cards.locator(".finals-ranking-main strong").allTextContents();
  expect(names).toHaveLength(13);
  expect(names).toEqual(expect.arrayContaining(WORLD_CUP_FINALISTS));
});

test("MLS 使用 major-league-soccer ID 進入 ESPN 球員名單流程", async ({ page }) => {
  const espnRequests = [];
  await page.route(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/**",
    async route => {
      const url = route.request().url();
      espnRequests.push(url);
      if (/\/teams\/2026\/roster(?:\?|$)/.test(url)) {
        await route.fulfill({ json: mlsRosterFixture });
        return;
      }
      if (/\/teams(?:\?|$)/.test(url)) {
        await route.fulfill({ json: mlsTeamsFixture });
        return;
      }
      await route.abort();
    }
  );

  await openMobileFeature(
    page,
    "competitionGuideBtn",
    "#competitionGuideModal[data-ui-modal]"
  );

  const mls = page.locator(
    'details.competition-league-card[data-league-id="major-league-soccer"]'
  );
  await mls.locator(":scope > summary").click();
  await mls.locator(
    '.league-team-launch[data-team-name="Inter Miami CF"]'
  ).click();

  const teamModal = page.locator(
    "#competitionTeamModal[data-ui-modal]"
  );
  await expect(teamModal).toBeVisible();
  await expect(teamModal.locator("[data-modal-scroll]")).toHaveCount(1);
  await expect(teamModal.locator("#competitionSquadSearch")).toBeVisible();

  const messiRow = teamModal.locator(".competition-squad-row", {
    hasText: "Lionel Messi"
  });
  await expect(messiRow).toBeVisible();
  await expect(messiRow.locator(".competition-squad-number")).toHaveText("10");
  expect(
    espnRequests.some(url =>
      url.includes("/sports/soccer/usa.1/teams")
    ),
    "MLS 應以 usa.1 讀取 ESPN 球隊與球員名單"
  ).toBe(true);
});
