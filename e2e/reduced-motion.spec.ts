import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('reduced motion cuts straight to the result (§5.4.6)', async ({ page }) => {
  await page.goto('/play');
  const input = page.getByLabel('Your answer', { exact: true });
  await expect(input).toBeEnabled();
  // The shared e2e store may already have this device mid-climb; any valid input works for any slot.
  await input.fill('5');
  const started = Date.now();
  await input.press('Enter');
  await expect(page.getByRole('button', { name: /Next riddle|See your results/ })).toBeVisible();
  // No 650 ms pan and no 2.6 s boost: the result is there as soon as the server answers.
  expect(Date.now() - started).toBeLessThan(1500);
});

test('reduced motion keeps the scene still: no idle bob', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByLabel('Your answer', { exact: true })).toBeEnabled();
  const balloon = page.getByRole('img', { name: /Your balloon/ });
  const y1 = (await balloon.boundingBox())!.y;
  await page.waitForTimeout(900);
  const y2 = (await balloon.boundingBox())!.y;
  expect(y2).toBe(y1);
});
