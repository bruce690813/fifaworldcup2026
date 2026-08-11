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
  await expect(page.locator(".version-badge")).toHaveText("v2.146");
  await expect(page.locator(".version-badge")).toBeHidden();
});

test("v2.139 總教練搜尋可直達國家隊紀錄", async ({ page }) => {
  await page.locator("#searchBox").fill("森保一");
  const coachResult = page.locator('.search-suggestion[data-type="coach"][data-code="JPN"]');
  await expect(coachResult).toBeVisible();
  await coachResult.click();
  await expect(page.locator(".roster-team-summary")).toContainText("總教練");
  await expect(page.locator(".roster-team-summary")).toContainText("森保一");
});

test("v2.139 國家紀錄、出生日期與球員詳細視窗", async ({ page }) => {
  await page.locator("#searchBox").fill("日本");
  await page.locator('.search-suggestion[data-type="team"][data-code="JPN"]').click();
  await expect(page.locator(".roster-team-summary")).toContainText("世界盃最佳名次");
  await expect(page.locator(".country-summary-list")).toContainText("國內足球聯賽");
  await expect(page.locator(".country-summary-list")).toContainText("熱門景點");
  await expect(page.locator("#countryEncyclopediaBtn")).toHaveCount(0);
  const playerRow = page.locator('tr[data-player-name="SUZUKI Zion"]');
  await expect(playerRow).toContainText("鈴木彩艷");
  await expect(playerRow.locator('[data-label="出生日期"]')).toContainText(/\d{4}\/\d{2}\/\d{2}/);
  await playerRow.click();
  await expect(page.locator("#playerDetailModal")).toHaveClass(/open/);
  await expect(page.locator("#playerDetailBody")).toContainText("國家隊紀錄");
  await expect(page.locator("#playerDetailBody")).toContainText("FIFA 官方球員統計");
});

test("v2.146 四種指定視窗尺寸無主控台錯誤", async ({ page }) => {
  const errors = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  for (const viewport of [
    { width:1920, height:1080 }, { width:1366, height:768 },
    { width:1024, height:768 }, { width:390, height:844 }
  ]) {
    await page.setViewportSize(viewport);
    await page.reload({ waitUntil:"domcontentloaded" });
    await expect(page.locator(".version-badge")).toHaveText("v2.146");
    await page.screenshot({ path:`test-results/v2.146-${viewport.width}x${viewport.height}.png`, fullPage:false });
  }
  expect(errors).toEqual([]);
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

test("足球知識頻道從賽事指南移至足球知識獨立入口", async ({ page }) => {
  const guideModal = await openMobileFeature(
    page,
    "competitionGuideBtn",
    "#competitionGuideModal[data-ui-modal]"
  );
  await expect(guideModal.locator('[data-competition-tab="knowledge"]')).toHaveCount(0);
  await page.locator("#closeCompetitionGuideBtn").click();

  const channelsModal = await openMobileFeature(
    page,
    "footballKnowledgeChannelsBtn",
    "#footballKnowledgeChannelsModal[data-ui-modal]"
  );
  const channelCards = channelsModal.locator(".football-knowledge-card");
  await expect(channelCards).toHaveCount(4);
  await expect(channelCards.locator(".football-knowledge-copy strong")).toHaveText([
    "足球元年", "越位先生_Mr. Offside", "老K足球新聞", "綠茵實戰錄"
  ]);
  await expect(channelCards.nth(3).locator('img[src="assets/knowledge_channels/green-field-practice.png"]')).toBeVisible();
  await expect(channelsModal.locator("[data-modal-scroll]")).toHaveCount(1);
});

test("v2.141 桌面球員出生日期與身高欄位不重疊", async ({ page }) => {
  await page.setViewportSize({ width:1366, height:768 });
  await page.locator("#searchBox").fill("突尼西亞");
  await page.locator('.search-suggestion[data-type="team"][data-code="TUN"]').click();
  const birthCell = page.locator(".roster-table tbody tr").first().locator("td.age");
  const heightCell = page.locator(".roster-table tbody tr").first().locator("td.height");
  await expect(birthCell).toBeVisible();
  await expect(heightCell).toBeVisible();
  const birthBox = await birthCell.boundingBox();
  const heightBox = await heightCell.boundingBox();
  expect(birthBox.x + birthBox.width).toBeLessThanOrEqual(heightBox.x + 0.5);
  expect(birthBox.width).toBeGreaterThanOrEqual(149);
  expect(heightBox.width).toBeGreaterThanOrEqual(81);
  await page.screenshot({ path:"test-results/v2.141-roster-columns-1366x768.png", fullPage:false });
});

test("v2.141 荷蘭對摩洛哥比分與 PK 結果分行顯示", async ({ page }) => {
  await page.setViewportSize({ width:1366, height:768 });
  await page.locator("#searchBox").fill("摩洛哥");
  await page.locator('.search-suggestion[data-type="team"][data-code="MAR"]').click();
  const matchRow = page.locator(".results-table tbody tr", { hasText:"荷蘭" }).filter({ hasText:"PK" });
  await expect(matchRow).toBeVisible();
  await expect(matchRow.locator(".scoreline-score")).toHaveText("1-1");
  await expect(matchRow.locator(".match-score-context")).toHaveText("PK 荷蘭 2-3 摩洛哥");
  await expect(matchRow.locator('[data-tooltip]')).toHaveCount(0);
  const scoreBox = await matchRow.locator(".scoreline-score").boundingBox();
  const contextBox = await matchRow.locator(".match-score-context").boundingBox();
  expect(scoreBox.y + scoreBox.height).toBeLessThanOrEqual(contextBox.y + 0.5);
  await matchRow.screenshot({ path:"test-results/v2.141-netherlands-morocco-score.png" });
});

test("FIFA 排名國名保持單行且國家頁使用大型摘要標題", async ({ page }) => {
  const rankingModal = await openMobileFeature(
    page,
    "fifaLatestRankingBtn",
    "#fifaLatestRankingModal[data-ui-modal]"
  );
  const spainLink = rankingModal.locator(".fifa-ranking-map-link", { hasText:"西班牙" });
  await expect(spainLink).toBeVisible();
  expect(await spainLink.evaluate(node => getComputedStyle(node).whiteSpace)).toBe("nowrap");

  await rankingModal.locator('[data-team-code="ESP"]').click();
  await expect(page.locator(".country-hero-card")).toHaveCount(0);
  await expect(page.locator(".country-summary-title h2")).toHaveText("西班牙");
  await expect(page.locator(".country-summary-title-subline")).toContainText("SPAIN");
  await expect(page.locator(".country-summary-title-subline")).toContainText("ESP");
});

test("手機球員卡不顯示牌卡欄位，紅牌保留在球員詳細資料", async ({ page }) => {
  await openMobileFeature(page, "teamListBtn", "#teamDrawer");
  await page.locator('.team-item[data-code="USA"]').click();

  const balogunRow = page.locator('tr[data-player-name="BALOGUN Folarin"]');
  await expect(balogunRow).toBeVisible();
  await expect(balogunRow.locator(".discipline, .discipline-card")).toHaveCount(0);
  await balogunRow.click();
  const detail = page.locator("#playerDetailModal");
  await expect(detail).toBeVisible();
  await expect(detail.getByText("本屆累計牌卡", { exact:true })).toBeVisible();
  await expect(detail.locator(".discipline-card-red")).toHaveCount(1);
  await page.screenshot({ path:"test-results/v2.144-player-detail-discipline-390x844.png", fullPage:false });
});

test("手機全部功能分組不裁切且可捲動點擊最後一項", async ({ page }) => {
  await page.locator("#mobileFeatureMenuBtn").click();
  const menu = page.locator("#mobileFeatureMenu");
  await expect(menu).toHaveClass(/open/);

  const layers = await menu.evaluate(node => ({
    backdrop:Number.parseInt(getComputedStyle(node.querySelector(".mobile-feature-backdrop")).zIndex, 10),
    drawer:Number.parseInt(getComputedStyle(node.querySelector(".mobile-feature-drawer")).zIndex, 10)
  }));
  expect(layers.drawer).toBeGreaterThan(layers.backdrop);

  const groups = menu.locator(".mobile-feature-group");
  await expect(groups).toHaveCount(4);
  const groupOverflow = await groups.evaluateAll(nodes => nodes.map(node => ({
    clientHeight:node.clientHeight,
    scrollHeight:node.scrollHeight
  })));
  expect(groupOverflow.every(({ clientHeight, scrollHeight }) => scrollHeight <= clientHeight + 1)).toBe(true);
  const scroll = menu.locator(".mobile-feature-scroll");
  expect(await scroll.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);

  const item = menu.locator('[data-mobile-nav-target="competitionGuideBtn"]');
  await item.scrollIntoViewIfNeeded();
  const hitTarget = await item.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest("[data-mobile-nav-target]")?.dataset.mobileNavTarget || "";
  });
  expect(hitTarget).toBe("competitionGuideBtn");
  await page.screenshot({ path:"test-results/v2.144-mobile-drawer-scroll-390x844.png", fullPage:false });
  await item.click();
  await expect(page.locator("#competitionGuideModal")).toHaveClass(/open/);
});

test("忠義各梯隊背號使用粉紅球衣造型", async ({ page }) => {
  const guideModal = await openMobileFeature(
    page,
    "competitionGuideBtn",
    "#competitionGuideModal[data-ui-modal]"
  );
  const zyesLeague = guideModal.locator('[data-league-id="zyes-youth-football"]');
  await zyesLeague.locator("summary").click();
  await zyesLeague.locator('[data-team-name="ZYES U10"]').click();

  const jersey = page.locator(".zyes-youth-roster .competition-squad-number").first();
  await expect(jersey).toBeVisible();
  const style = await jersey.evaluate(node => {
    const computed = getComputedStyle(node);
    return { backgroundImage:computed.backgroundImage, clipPath:computed.clipPath };
  });
  expect(style.backgroundImage).toContain("linear-gradient");
  expect(style.backgroundImage).toMatch(/rgb\((223, 49, 91|240, 83, 117)\)/);
  expect(style.clipPath).toContain("polygon");
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

test("mobile group labels remain visible and non-overlapping", async ({ page }) => {
  await expect(page.locator("#map.leaflet-container")).toBeVisible({
    timeout: 30_000
  });

  for (const group of ["C", "E", "H", "I", "J", "L"]) {
    await page.locator("#groupFilter").selectOption(group);
    const labels = page.locator(
      "#map .leaflet-marker-pane .group-label-marker .marker-label"
    );
    await expect(labels).toHaveCount(4);

    await expect.poll(async () => labels.evaluateAll(nodes => {
      const map = document.querySelector("#map");
      if (!(map instanceof HTMLElement)) return false;
      const mapRect = map.getBoundingClientRect();
      const rects = nodes.map(node => node.getBoundingClientRect());
      const allInside = rects.every(rect =>
        rect.width > 0 && rect.height > 0
        && rect.left >= mapRect.left - 1
        && rect.right <= mapRect.right + 1
        && rect.top >= mapRect.top - 1
        && rect.bottom <= mapRect.bottom + 1
      );
      const hasOverlap = rects.some((rect, index) =>
        rects.slice(index + 1).some(other => !(
          rect.right <= other.left || other.right <= rect.left
          || rect.bottom <= other.top || other.bottom <= rect.top
        ))
      );
      return allInside && !hasOverlap;
    })).toBe(true);
  }
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
    /https:\/\/site\.api\.espn\.com\/apis\/site\/v2\/sports\/soccer\/usa\.1\/.*$/,
    async route => {
      const url = route.request().url();
      espnRequests.push(url);
      if (/\/teams\/2026\/roster(?:\?|$)/.test(url)) {
        await route.fulfill({ json: mlsRosterFixture });
        return;
      }
      if (/\/teams\/2026(?:\?|$)/.test(url)) {
        await route.fulfill({ json: { coach: { displayName: "Javier Mascherano" } } });
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
  await expect.poll(() => espnRequests, { timeout:5_000 }).not.toHaveLength(0);

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

test("v2.146 桌面全部功能與決賽排行版面", async ({ page }) => {
  await page.setViewportSize({ width:1366, height:768 });
  await page.reload({ waitUntil:"domcontentloaded" });
  await page.locator("#desktopMegaMenuBtn").click();

  const menu = page.locator("#desktopMegaMenu");
  await expect(menu).toHaveClass(/open/);
  const groups = menu.locator(".desktop-mega-group");
  await expect(groups).toHaveCount(4);

  const about = menu.locator(".desktop-about-site");
  const firstGroup = groups.first();
  const [aboutBox, groupBox] = await Promise.all([about.boundingBox(), firstGroup.boundingBox()]);
  expect(aboutBox).not.toBeNull();
  expect(groupBox).not.toBeNull();
  expect(aboutBox.width).toBeGreaterThan(groupBox.width * 3);

  const themeSongs = menu.locator('[data-desktop-nav-target="themeSongsBtn"]');
  await themeSongs.scrollIntoViewIfNeeded();
  await expect(themeSongs).toBeVisible();
  await page.screenshot({ path:"test-results/v2.146-desktop-mega-1366x768.png", fullPage:false });

  const finals = menu.locator('[data-desktop-nav-target="finalsRankingBtn"]');
  await finals.scrollIntoViewIfNeeded();
  await finals.click();
  const dialog = page.locator("#finalsRankingDialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".finals-ranking-card")).toHaveCount(13);
  await expect(dialog.locator(".finals-ranking-country-flag svg")).toHaveCount(13);
  await expect(dialog.locator(".finals-ranking-flag")).toHaveCount(0);
  await expect(dialog.locator('[data-country-code="ENG"] svg')).toHaveCount(1);
  await page.screenshot({ path:"test-results/v2.146-finals-ranking-1366x768.png", fullPage:false });
});
