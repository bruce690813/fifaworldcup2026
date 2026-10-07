import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const phase = process.argv[2] || 'after';
const browser = await chromium.launch();
const report = [];
for (const [width,height] of [[1920,1080],[1366,768],[1024,768],[390,844]]) {
  const page = await browser.newPage({viewport:{width,height}});
  const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('console', m=>{if(m.type()==='error') errors.push(m.text());});
  for(const ext of ['js','css']) await page.route(`https://unpkg.com/leaflet@1.9.4/dist/leaflet.${ext}`,r=>r.fulfill({body:readFileSync(`node_modules/leaflet/dist/leaflet.${ext}`),contentType:ext==='js'?'application/javascript':'text/css'}));
  if(phase==='before') await page.route('http://127.0.0.1:8000/',r=>r.fulfill({body:execFileSync('git',['show','1f44297:index.html'],{maxBuffer:8*1024*1024}),contentType:'text/html'}));
  await page.goto('http://127.0.0.1:8000/',{waitUntil:'domcontentloaded'});
  await page.locator('#searchBox').fill('加拿大');
  await page.locator('.search-suggestion[data-type="team"][data-code="CAN"]').click();
  await page.locator('.roster-section').scrollIntoViewIfNeeded();
  const coach=page.locator('.person-portrait--coach');
  const row=page.locator('.roster-table tbody tr').filter({hasText:'JONES'});
  await row.scrollIntoViewIfNeeded();
  const portraits=page.locator('.roster-section .person-portrait');
  await portraits.evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode().catch(()=>{}))));
  const metrics={width,height,coach:await coach.count(),jones:await row.locator('img.person-portrait').count(),name:await row.locator('.roster-player-name-line').innerText(),errors};
  if(phase==='after') {
    if(metrics.coach!==1||metrics.jones!==1||!metrics.name.includes('Alfie JONES')) throw Error(JSON.stringify(metrics));
    for(const img of [coach,row.locator('img.person-portrait')]) if(!await img.evaluate(i=>i.complete&&i.naturalWidth>0)) throw Error('Portrait failed to load');
  }
  await page.screenshot({path:`artifacts/v2.180/${phase}-${width}x${height}.png`});
  await page.locator('.roster-team-summary').scrollIntoViewIfNeeded();
  await page.screenshot({path:`artifacts/v2.180/${phase}-coach-${width}x${height}.png`});
  report.push(metrics);
  await page.close();
}
writeFileSync(`artifacts/v2.180/${phase}-report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
await browser.close();
