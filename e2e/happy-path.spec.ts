import { expect, test, type Page } from '@playwright/test';

/** Everything the browser receives before each answer must be free of answers (§10.2). */
const SECRETS = /answer_value|trap_value|accepted_answers|trap_answers|"answerDisplay"|piano|keychain|about 9%|6 flips/i;

async function answer(page: Page, value: string) {
  const input = page.getByLabel('Your answer', { exact: true });
  await expect(input).toBeEnabled();
  await input.fill(value);
  await input.press('Enter');
}

test('homepage → the climb → results and debrief → share', async ({ page, context, browserName }, info) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // Record every API response and whether it came before the matching answer.
  const leaks: string[] = [];
  let answered = 0;
  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('/api/')) return;
    if (url.includes('/api/riddle/answer')) {
      answered++;
      return;
    }
    if (url.includes('/api/results')) return;
    const body = await res.text().catch(() => '');
    if (SECRETS.test(body)) leaks.push(`${url} (after ${answered} answers)`);
  });
  const comparative: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/results') && answered < 3) comparative.push(req.url());
  });

  await page.goto('/');
  // How to play opens on the first visit.
  await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Riddler' })).toBeVisible();
  await page.getByRole('link', { name: 'Start the climb' }).first().click();

  // Riddle 1: word
  await expect(page.getByText('Riddle 1 of 3')).toBeVisible();
  await answer(page, 'The Piano');
  await expect(page.getByText('Correct', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/^You said/)).toContainText('a piano');
  await expect(page.locator('[aria-live="polite"][aria-atomic="true"]')).toContainText('Correct.');
  await page.getByRole('button', { name: 'Next riddle' }).click();

  // Riddle 2: percent, with an unparseable attempt first. The fuel lights after a short grace (§5.3).
  await expect(page.getByText('Riddle 2 of 3')).toBeVisible();
  await expect(page.getByText(/The fuel starts in/)).toBeVisible();
  await answer(page, 'lots');
  await expect(page.getByText('Type a number from 0 to 100')).toBeVisible();
  await answer(page, '1 in 11');
  await expect(page.getByText('Oracle', { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Next riddle' }).click();

  // Refresh mid-climb: resumes at riddle 3 with altitude intact (§10.3, §10.16)
  await expect(page.getByText('Riddle 3 of 3')).toBeVisible();
  const altBefore = await page.getByText(/\d+(\.\d+)? (km|m)$/).last().textContent();
  await page.reload();
  await expect(page.getByText('Riddle 3 of 3')).toBeVisible();
  await expect(page.getByText(/\d+(\.\d+)? (km|m)$/).last()).toHaveText(altBefore!);

  // Riddle 3: quantity, fall for the trap
  await answer(page, '4');
  await expect(page.getByText('You fell for the trap')).toBeVisible({ timeout: 15_000 });
  // Riddle 3's card carries the Landed line: one click to the results (§5.3).
  await expect(page.getByText('Climb complete', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'See your results' }).click();

  // Results: early estimate (only this player), explanations, share
  // The caption appears once the bell-curve reveal ends (slow under a dev server with tracing).
  await expect(page.getByText('Early estimate · updates as people play')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Riddle by riddle' })).toBeVisible();
  await expect(page.getByText(/A piano has 88 keys/)).toBeVisible();
  await page.getByRole('button', { name: 'Show the math' }).nth(1).click();
  await expect(page.locator('.katex').first()).toBeVisible();

  await page.getByRole('button', { name: 'Share result' }).click();
  await expect(page.getByRole('status')).toContainText(/Copied|Copy this/);
  if (info.project.name === 'desktop') {
    // The Windows clipboard stores CRLF.
    const text = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
    expect(text).toMatch(/^Riddler #1 — Top \d+% \(early\)\n🟢 ✅(⚡)?\n🟡 🔮(⚡)?\n🔴 🪤?📈(⚡)?\nriddlerr\.com$/u);
  }

  expect(leaks).toEqual([]);
  expect(comparative).toEqual([]);

  // The homepage now says the day is done.
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'See your results' }).first()).toBeVisible();
});

test('the balloon stays horizontally centered', async ({ page }) => {
  await page.goto('/play');
  await page.getByRole('img', { name: /Your balloon/ }).waitFor();
  const box = await page.getByRole('img', { name: /Your balloon/ }).boundingBox();
  const vw = page.viewportSize()!.width;
  expect(Math.abs(box!.x + box!.width / 2 - vw / 2)).toBeLessThanOrEqual(1);
});
