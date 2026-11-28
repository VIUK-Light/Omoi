// 対話モード: 選択画面のチェックからOmoi Liveへの遷移を検証する。
// ルームサーバーはモックで置き換え、本流側の挙動だけを見る。
const { test, expect } = require('@playwright/test');

// 本流側は localStorage の omoiLiveOrigin でオリジンを差し替えられるため、
// テストではモック用オリジンを使い、デプロイURLに依存しない
const LIVE_ORIGIN = 'https://omoi-live.test';
const ROOM_RESPONSE = {
  code: 'LIVE01',
  hostKey: 'HOSTKEY12345678',
  hostUrl: '/host/LIVE01?k=HOSTKEY12345678',
  joinUrl: '/r/LIVE01'
};

test('対話モードにチェックすると問いデータとともにOmoi Liveへ遷移する', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('omoiLiveOrigin', 'https://omoi-live.test'));
  let requestBody = null;
  await page.route(`${LIVE_ORIGIN}/api/rooms`, async route => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ json: ROOM_RESPONSE });
  });
  await page.route(`${LIVE_ORIGIN}/host/**`, async route => {
    await route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<html><body><p id="stub">OMOI-LIVE-STUB</p></body></html>' });
  });

  await page.goto('/画面/選択/level-select.html');
  await page.locator('label[for="level2"]').click();
  await page.locator('label[for="liveMode"]').click();
  await page.locator('#nextButton').click();

  await page.waitForURL(`${LIVE_ORIGIN}/host/LIVE01*`);
  await expect(page.locator('#stub')).toHaveText('OMOI-LIVE-STUB');

  expect(Array.isArray(requestBody.questions)).toBe(true);
  expect(requestBody.questions.length).toBeGreaterThan(0);
  for (const card of requestBody.questions) {
    expect(typeof card.question).toBe('string');
    expect(card.question.length).toBeGreaterThan(0);
  }
});

test('対話モードのチェックなしでは従来どおり質問画面へ進む', async ({ page }) => {
  await page.goto('/画面/選択/level-select.html');
  await page.locator('label[for="level2"]').click();
  await page.locator('#nextButton').click();
  // 「前回の続き」復帰で追加パラメータが付くことがあるためパスだけを見る
  await expect(page).toHaveURL(/question\.html/);
  expect(page.url()).not.toContain('omoi-live');
});

test('自分で選ぶの確認画面からも対話モードで開始できる', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('omoiLiveOrigin', 'https://omoi-live.test'));
  let requestBody = null;
  await page.route(`${LIVE_ORIGIN}/api/rooms`, async route => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ json: ROOM_RESPONSE });
  });
  await page.route(`${LIVE_ORIGIN}/host/**`, async route => {
    await route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<html><body><p id="stub">OMOI-LIVE-STUB</p></body></html>' });
  });

  await page.goto('/画面/選択/custom-select.html');
  await page.locator('input[type="checkbox"]').first().locator('xpath=..').click();
  await page.locator('#nextButton').click();
  await expect(page).toHaveURL(/custom-confirm\.html/);
  await expect(page.locator('#confirmStartButton')).toBeEnabled({ timeout: 15000 });
  await page.locator('label[for="liveMode"]').click();
  await page.locator('#confirmStartButton').click();

  await page.waitForURL(`${LIVE_ORIGIN}/host/LIVE01*`);
  expect(Array.isArray(requestBody.questions)).toBe(true);
  expect(requestBody.questions.length).toBeGreaterThan(0);
});
