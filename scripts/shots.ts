/**
 * Dev: screenshot every screen of a full play at desktop and phone sizes.
 * Usage: npx tsx scripts/shots.ts [baseUrl] [outDir]
 * Needs a running dev server. Each viewport uses a fresh context, so a fresh device.
 */
import { chromium, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:3000';
const out = path.resolve(process.argv[3] || 'shots');
fs.mkdirSync(out, { recursive: true });

async function answer(page: Page, value: string) {
  const input = page.getByLabel('Your answer', { exact: true });
  await input.waitFor();
  await page.waitForFunction(() => !(document.querySelector('input[aria-label="Your answer"]') as HTMLInputElement)?.disabled, null, { timeout: 15_000 });
  await input.fill(value);
  await input.press('Enter');
}

const sizes = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
];

(async () => {
  const browser = await chromium.launch();
  for (const s of sizes) {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const shot = async (n: string, full = false) => page.screenshot({ path: path.join(out, `${s.name}-${n}.png`), fullPage: full });

    await page.goto(base);
    await page.waitForTimeout(800);
    await shot('01-howto');
    const gotIt = page.getByRole('button', { name: 'Got it' });
    if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
    await page.waitForTimeout(500);
    await shot('02-home');
    await shot('02-home-full', true);

    await page.getByRole('link', { name: 'Start the climb' }).first().click();
    await page.getByText('Riddle 1 of 3').waitFor();
    await page.waitForTimeout(3000);
    await shot('03-riddle1');
    await answer(page, 'The Piano');
    await page.waitForTimeout(1200);
    await shot('04-burn');
    await page.getByRole('button', { name: 'Next riddle' }).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(900);
    await shot('05-card1');
    await page.getByRole('button', { name: 'Next riddle' }).click();
    await page.getByText('Riddle 2 of 3').waitFor();
    await page.waitForTimeout(3000);
    await shot('06-riddle2');
    await answer(page, '1 in 11');
    await page.getByRole('button', { name: 'Next riddle' }).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: 'Next riddle' }).click();
    await page.getByText('Riddle 3 of 3').waitFor();
    await page.waitForTimeout(3000);
    await shot('07-riddle3');
    await answer(page, '4');
    await page.getByRole('button', { name: 'See your results' }).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(900);
    await shot('08-card3');
    await page.getByRole('button', { name: 'See your results' }).click();
    await page.waitForTimeout(1000);
    await shot('08b-landing');
    await page.waitForTimeout(1150);
    await shot('08c-landed');
    await page.getByRole('heading', { name: 'Riddle by riddle' }).waitFor({ timeout: 20_000 });
    await page.waitForTimeout(2500);
    await shot('09-results');
    await shot('09-results-full', true);
    await ctx.close();
  }
  await browser.close();
  console.log('shots in', out);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
