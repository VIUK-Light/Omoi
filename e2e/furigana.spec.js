const { test, expect } = require('@playwright/test');

test('furigana settings open at the top right and preserve the original question text', async ({ page }) => {
  await page.goto('/画面/対話/question.html?level=2');

  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  const question = page.locator('#questionText');
  const originalText = await question.textContent();
  await expect(question.locator('ruby')).toHaveCount(0);

  const settingsIcon = page.locator('.furigana-settings > summary');
  const themeIcon = page.locator('.theme-control > summary');
  const settingsBounds = await settingsIcon.boundingBox();
  const themeBounds = await themeIcon.boundingBox();
  expect(settingsBounds.x + settingsBounds.width).toBeLessThan(themeBounds.x);
  await expect(page.locator('#classroomModeToggle')).toBeHidden();

  await settingsIcon.click();
  const toggle = page.locator('#furiganaToggle');
  await expect(toggle).toBeVisible();
  await expect(page.locator('#textSizeControl')).toBeVisible();
  await expect(page.locator('#mediumTextToggle')).toHaveAttribute('aria-pressed', 'true');
  // 授業モードUIはstudentモードのみ
  await expect(page.locator('#classroomModeToggle')).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(question.locator('ruby')).not.toHaveCount(0);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(question).toHaveText(originalText);
  await expect(question.locator('ruby')).toHaveCount(0);
});

test('furigana keeps a clear gap from the body text with smaller readings', async ({ page }) => {
  await page.goto('/画面/対話/question.html?level=4&id=youth-pregnancy-025');
  await expect(page.locator('#questionText')).toContainText('それでも理由を聞きたいと思う？');

  await page.locator('.furigana-settings > summary').click();
  await page.locator('#furiganaToggle').click();

  const metrics = await page.evaluate(() => {
    const measure = selector => {
      const text = document.querySelector(selector);
      const rt = text.querySelector('rt');
      const ruby = rt.parentElement;
      const range = document.createRange();
      range.selectNodeContents(ruby.firstChild);
      const base = range.getBoundingClientRect();
      const rtRect = rt.getBoundingClientRect();
      const textStyle = getComputedStyle(text);
      return {
        gap: base.top - rtRect.bottom,
        centerDelta: Math.abs((rtRect.left + rtRect.right) / 2 - (base.left + base.right) / 2),
        rtSize: Number.parseFloat(getComputedStyle(rt).fontSize),
        baseSize: Number.parseFloat(textStyle.fontSize),
        lineHeight: Number.parseFloat(textStyle.lineHeight)
      };
    };
    return {
      question: measure('#questionText'),
      scenario: measure('#scenarioText')
    };
  });

  for (const metric of [metrics.question, metrics.scenario]) {
    expect(metric.gap).toBeGreaterThan(1);
    expect(metric.centerDelta).toBeLessThan(1);
    expect(metric.rtSize).toBeLessThan(metric.baseSize * 0.5);
  }
  expect(metrics.question.lineHeight).toBeGreaterThan(metrics.question.baseSize * 1.9);
  expect(metrics.scenario.lineHeight).toBeGreaterThan(metrics.scenario.baseSize * 2);
});

test('text size has three levels and classroom UI is only shown in student mode', async ({ page }) => {
  await page.goto('/画面/対話/question.html?level=2');

  await expect(page.locator('#nextQuestionButton')).toBeEnabled();
  const question = page.locator('#questionText');
  const mediumFontSize = Number.parseFloat(await question.evaluate(element => getComputedStyle(element).fontSize));
  const nextButton = page.locator('#nextQuestionButton');
  const defaultButtonHeight = (await nextButton.boundingBox()).height;

  const smallToggle = page.locator('#smallTextToggle');
  const mediumToggle = page.locator('#mediumTextToggle');
  const largeToggle = page.locator('#largeTextToggle');
  const classroomToggle = page.locator('#classroomModeToggle');
  await page.locator('.furigana-settings > summary').click();
  await expect(mediumToggle).toHaveAttribute('aria-pressed', 'true');

  await smallToggle.click();
  const smallFontSize = Number.parseFloat(await question.evaluate(element => getComputedStyle(element).fontSize));
  expect(smallFontSize).toBeLessThan(mediumFontSize);
  await expect(smallToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(mediumToggle).toHaveAttribute('aria-pressed', 'false');

  await largeToggle.click();
  const largeFontSize = Number.parseFloat(await question.evaluate(element => getComputedStyle(element).fontSize));
  expect(largeFontSize).toBeGreaterThan(mediumFontSize);
  await expect(largeToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(smallToggle).toHaveAttribute('aria-pressed', 'false');

  await page.locator('#furiganaToggle').click();
  // 授業モードUIはstudentモードのみ。allモードでは設定内トグルも表示しない。
  await expect(classroomToggle).toBeHidden();
  await expect(page.locator('#classroomModeButton')).toBeHidden();
  await expect(page.locator('#questionProgress')).toBeHidden();
});
