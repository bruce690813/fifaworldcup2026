import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const phase = process.argv[2] || 'after';
const browser = await chromium.launch();
const report = [];
for (const [width,height] of [[1920,1080],[1366,768],[1024,768],[390,844]]) {
  const page = await browser.newPage({ viewport:{width,height}, locale:'zh-TW' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (const ext of ['js','css']) await page.route(`https://unpkg.com/leaflet@1.9.4/dist/leaflet.${ext}`, route => route.fulfill({body:readFileSync(`node_modules/leaflet/dist/leaflet.${ext}`),contentType:ext === 'js' ? 'application/javascript' : 'text/css'}));
  await page.goto('http://127.0.0.1:8000/', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => window.openClubLogoQuiz('real-madrid'));
  await page.locator('.club-quiz-logo-frame img').evaluate(img => img.decode().catch(() => {}));
  await page.screenshot({path:`artifacts/v2.178/${phase}-${width}x${height}.png`});
  const metrics = await page.evaluate(() => {
    const frame = document.querySelector('.club-quiz-logo-frame');
    const options = [...document.querySelectorAll('.club-quiz-option')];
    const scroll = document.querySelector('.club-logo-quiz-scroll');
    return {radius:getComputedStyle(frame).borderRadius,options:options.map(el => ({text:el.innerText,x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,height:el.getBoundingClientRect().height})),overflow:scroll.scrollHeight-scroll.clientHeight,horizontalOverflow:scroll.scrollWidth-scroll.clientWidth};
  });
  if (phase === 'after') {
    if (metrics.radius !== '50%' || metrics.options.some(o => /[a-z]/i.test(o.text)) || metrics.options[0].y !== metrics.options[1].y || metrics.options[2].y !== metrics.options[3].y || metrics.overflow > 1 || metrics.horizontalOverflow > 1) throw Error(JSON.stringify(metrics));
  }
  await page.locator('[data-club-id="real-madrid"]').click();
  await page.screenshot({path:`artifacts/v2.178/${phase}-answered-${width}x${height}.png`});
  const next = await page.locator('.club-quiz-next').boundingBox();
  if (phase === 'after' && (!next || next.y + next.height > height)) throw Error('Next button below viewport');
  await page.locator('.club-quiz-next').click();
  if (await page.locator('[data-quiz-round]').innerText() !== '2') throw Error('Advance failed');
  await page.keyboard.press('Escape');
  if (await page.locator('#clubLogoQuizModal').evaluate(el => el.classList.contains('open'))) throw Error('Escape failed');
  report.push({width,height,...metrics,errors});
  await page.close();
}
writeFileSync(`artifacts/v2.178/${phase}-report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
await browser.close();
