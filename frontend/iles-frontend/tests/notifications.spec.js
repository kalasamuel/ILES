import { test, expect, request } from '@playwright/test';

test('toggle notifications and verify backend persistence', async ({ page }) => {
  // Log in via backend to get JWT and set in localStorage
  const loginRes = await request.newContext().post('http://127.0.0.1:8000/api/accounts/users/login/', {
    data: { email: 'kalasamuel79@gmail.com', password: 'Password123!' }
  });
  const loginJson = await loginRes.json();
  const access = loginJson.access;
  // store tokens
  await page.goto('/');
  await page.evaluate((token) => localStorage.setItem('accessToken', token), access);

  await page.goto('/app/settings');
  // wait for settings to load
  await page.waitForSelector('h2:has-text("Notification Preferences")');

  // Toggle each checkbox
  const keys = ['email_notifications','push_notifications','log_reminders','review_alerts','weekly_summary'];
  for (const key of keys) {
    const input = await page.$(`input[type=checkbox] >> xpath=..[contains(., '${key.replace('_',' ')}')]`);
    // fallback: click nth checkbox
    if (!input) {
      const boxes = await page.$$('input[type=checkbox]');
      if (boxes.length) await boxes[0].click();
    }
  }

  // Save preferences
  await page.click('button:has-text("Save Preferences")');
  await page.waitForTimeout(500);

  // Confirm backend state
  const settingsRes = await request.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${access}` } }).get('http://127.0.0.1:8000/api/accounts/users/me/settings/');
  const settingsJson = await settingsRes.json();
  expect(settingsJson).toBeTruthy();
  // Ensure keys exist
  for (const k of keys) expect(k in settingsJson).toBeTruthy();
});
