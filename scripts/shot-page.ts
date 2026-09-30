/**
 * Dev: screenshot one page at desktop and phone sizes.
 * Usage: npx tsx scripts/shot-page.ts <url> <outPrefix> [--full]
 */
import { chromium } from '@playwright/test';

const [url, prefix, flag] = process.argv.slice(2);

(async () => {
  const browser = await chromium.launch();
  for (const s of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'phone', width: 390, height: 844 },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height } });
    // Skip the first-visit How to play modal.
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('burner_seen_how', '1');
      } catch {
        /* ignore */
      }
    });
    const page = await ctx.newPage();
    await page.goto(url);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${prefix}-${s.name}.png`, fullPage: flag === '--full' });
    await ctx.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
