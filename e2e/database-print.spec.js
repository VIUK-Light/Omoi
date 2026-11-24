const { test, expect } = require('@playwright/test');

test.setTimeout(90_000);

function pdfPageCount(pdf) {
  const tree = pdf.toString('latin1').match(/\/Type\s*\/Pages\b[\s\S]*?\/Count\s+(\d+)/);
  return tree ? Number(tree[1]) : 0;
}

test('homepage navigation places the database link at the left edge', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const nav = page.locator('.home-nav');
  const database = nav.getByRole('link', { name: '質問データベース' });
  const guide = nav.getByRole('link', { name: '使い方' });
  const [databaseBox, guideBox] = await Promise.all([
    database.boundingBox(),
    guide.boundingBox(),
  ]);
  expect(databaseBox.x).toBeLessThan(40);
  expect(databaseBox.x).toBeLessThan(guideBox.x);
});

test('question picker loads the current question index', async ({ page }) => {
  await page.goto('/画面/選択/custom-select.html');
  await expect(page.locator('#customError')).toBeHidden();
  await expect(page.locator('#labelSelectionSummary')).toContainText('カテゴリー');
});

test('database selection supports three fixed card sizes and matching paper orientations', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/画面/データベース/database.html');
  await expect(page.locator('.db-card').first()).toBeVisible();
  await expect(page.locator('#dbCount')).toContainText('問を表示');

  const mobileWidths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(mobileWidths.document).toBeLessThanOrEqual(mobileWidths.viewport);

  for (let index = 0; index < 7; index += 1) {
    await page.locator('.db-card-check').nth(index).check();
  }
  const termQuestion = page.locator('.db-card[data-id="social-media-003"]');
  await expect(termQuestion.locator('.db-card-meta')).toContainText('追加日:');
  await termQuestion.locator('.db-card-details summary').click();
  await expect(termQuestion.locator('.db-detail-block').filter({ hasText: '用語' }).locator('dl')).toContainText('揶揄');
  await expect(termQuestion.locator('.db-card-details')).toContainText('全情報を見る');
  await expect(termQuestion.locator('.db-card-details')).toContainText('センシティブ度');
  await expect(termQuestion.locator('.db-card-details')).toContainText('視点');
  await expect(termQuestion.locator('.db-sources li')).toHaveCount(2);
  await expect(termQuestion.locator('.db-sources')).toContainText('https://zen-iku.jp/notices/181');
  await termQuestion.locator('.db-card-check').check();
  await page.getByRole('button', { name: '選択した問いの印刷レイアウトへ' }).click();

  const printDetailCard = page.locator('.print-card').filter({ hasText: 'social-media-003' });
  await page.locator('#optDetail').check();
  await expect(page.locator('#printOverflowWarning')).toBeVisible();
  await expect(page.locator('#printOverflowWarning')).toContainText('一部のカードで内容がはみ出る可能性');
  await expect(printDetailCard.locator('.print-card-extra').filter({ hasText: '背景説明' }))
    .toContainText('背景説明');
  await page.locator('#optDetail').uncheck();
  await expect(page.locator('#printOverflowWarning')).toBeHidden();
  await page.locator('#optDetail').check();
  await page.locator('#optHints').check();
  await expect(printDetailCard.locator('.print-card-detail')).toBeVisible();
  await expect(printDetailCard.locator('.print-card-hints')).toBeVisible();
  const sectionSpacing = await printDetailCard.evaluate(card => ({
    detail: Number.parseFloat(getComputedStyle(card.querySelector('.print-card-detail')).marginTop),
    hints: Number.parseFloat(getComputedStyle(card.querySelector('.print-card-hints')).marginTop),
  }));
  expect(sectionSpacing.hints).toBeGreaterThan(sectionSpacing.detail);
  await page.locator('#optDetail').uncheck();
  await page.locator('#optHints').uncheck();

  const layouts = [
    { size: 'compact', cardsPerPage: 4, pages: 2 },
    { size: 'half', cardsPerPage: 2, pages: 4 },
    { size: 'full', cardsPerPage: 1, pages: 8 },
  ];
  for (const layout of layouts) {
    await page.locator('#cardSize').selectOption(layout.size);
    if (layout.size === 'full' || layout.size === 'half') {
      await expect(page.locator('#largeModeOption')).toBeVisible();
      await expect(page.locator(layout.size === 'full' ? '#fullOrientationOption' : '#halfOrientationOption')).toBeVisible();
    } else {
      await expect(page.locator('#fullOrientationOption')).toBeHidden();
      await expect(page.locator('#halfOrientationOption')).toBeHidden();
      await expect(page.locator('#largeModeOption')).toBeHidden();
    }
    await expect(page.locator('.print-page')).toHaveCount(layout.pages);
    await expect(page.locator('.print-page').first().locator('.print-card'))
      .toHaveCount(layout.cardsPerPage);
    await expect(page.locator('#printStatus')).toContainText(`8問を${layout.pages}ページ`);
  }
  await expect(page.locator('#cardSize option')).toHaveCount(3);

  await page.locator('#cardSize').selectOption('compact');
  await expect(page.locator('#optTerms')).toBeChecked();
  await expect(page.locator('.print-card-terms').first()).toContainText('揶揄');
  const preview = await page.evaluate(() => {
    const frame = document.querySelector('.print-page-frame');
    const sheet = frame.querySelector('.print-page');
    const card = sheet.querySelector('.print-card');
    const matrix = new DOMMatrixReadOnly(getComputedStyle(sheet).transform);
    return {
      viewport: document.documentElement.clientWidth,
      frameWidth: frame.getBoundingClientRect().width,
      sheetWidth: sheet.offsetWidth,
      scale: matrix.a,
      cardRatio: card.getBoundingClientRect().width / card.getBoundingClientRect().height,
    };
  });
  expect(preview.frameWidth).toBeLessThanOrEqual(preview.viewport);
  expect(preview.sheetWidth).toBeGreaterThan(preview.frameWidth);
  expect(preview.scale).toBeLessThan(1);
  expect(preview.cardRatio).toBeCloseTo(80 / 125, 1);

  await page.emulateMedia({ media: 'print' });
  const pageSize = await page.locator('.print-page').first().evaluate(element => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  expect(pageSize.width).toBeGreaterThan(790);
  expect(pageSize.width).toBeLessThan(800);
  expect(pageSize.height).toBeGreaterThan(1120);
  expect(pageSize.height).toBeLessThan(1130);

  const cardSize = await page.locator('.print-card').first().evaluate(element => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  expect(cardSize.width).toBeGreaterThan(300);
  expect(cardSize.width).toBeLessThan(305);
  expect(cardSize.height).toBeGreaterThan(470);
  expect(cardSize.height).toBeLessThan(475);
  const compactTypography = await page.locator('.print-card-question').first().evaluate(element =>
    Number.parseFloat(getComputedStyle(element).fontSize)
  );
  expect(compactTypography).toBeGreaterThan(15);
  const compactCopyTypography = await page.locator('.print-card-copy').first().evaluate(element =>
    Number.parseFloat(getComputedStyle(element).fontSize)
  );
  expect(compactCopyTypography).toBeGreaterThan(11);

  const cardPositions = await page.locator('.print-page').first().locator('.print-card').evaluateAll(cards =>
    cards.map(card => ({
      x: Math.round(card.getBoundingClientRect().x),
      y: Math.round(card.getBoundingClientRect().y),
    }))
  );
  expect(new Set(cardPositions.map(position => position.x)).size).toBe(2);
  expect(new Set(cardPositions.map(position => position.y)).size).toBe(2);

  const clippedCompactCards = await page.locator('.print-card').evaluateAll(cards =>
    cards.map(card => {
      const content = card.querySelector('.print-card-content');
      return {
        id: card.querySelector('.print-card-meta').textContent,
        scrollHeight: content.scrollHeight,
        clientHeight: content.clientHeight,
      };
    }).filter(content => content.scrollHeight > content.clientHeight)
  );
  expect(clippedCompactCards).toEqual([]);

  await page.emulateMedia({ media: null });
  const compactPdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
  const compactPdfText = compactPdf.toString('latin1');
  const compactMediaBoxes = [...compactPdfText.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
  expect(pdfPageCount(compactPdf)).toBe(2);
  compactMediaBoxes.forEach(([, width, height]) => {
    expect(Number(width)).toBeLessThan(Number(height));
  });
  await page.locator('#cardSize').selectOption('half');
  const halfPreview = await page.evaluate(() => {
    const frame = document.querySelector('.print-page-frame');
    const cards = [...frame.querySelectorAll('.print-card')];
    const positions = cards.map(card => ({
      x: Math.round(card.getBoundingClientRect().x),
      y: Math.round(card.getBoundingClientRect().y),
    }));
    const firstCard = cards[0].getBoundingClientRect();
    return {
      viewport: document.documentElement.clientWidth,
      frameWidth: frame.getBoundingClientRect().width,
      positions,
      cardRatio: firstCard.width / firstCard.height,
    };
  });
  expect(halfPreview.frameWidth).toBeLessThanOrEqual(halfPreview.viewport);
  expect(new Set(halfPreview.positions.map(position => position.x)).size).toBe(2);
  expect(new Set(halfPreview.positions.map(position => position.y)).size).toBe(1);
  expect(halfPreview.cardRatio).toBeCloseTo(148.5 / 210, 1);
  await page.emulateMedia({ media: 'print' });
  const halfPageSize = await page.locator('.print-page').first().evaluate(element => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  expect(halfPageSize.width).toBeGreaterThan(1120);
  expect(halfPageSize.width).toBeLessThan(1130);
  expect(halfPageSize.height).toBeGreaterThan(790);
  expect(halfPageSize.height).toBeLessThan(800);
  const halfCardSize = await page.locator('.print-card').first().evaluate(element => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  expect(halfCardSize.width).toBeGreaterThan(529);
  expect(halfCardSize.width).toBeLessThan(533);
  expect(halfCardSize.height).toBeGreaterThan(746);
  expect(halfCardSize.height).toBeLessThan(750);
  const halfTextSize = await page.locator('.print-card-question').first().evaluate(element =>
    Number.parseFloat(getComputedStyle(element).fontSize)
  );
  expect(halfTextSize).toBeGreaterThan(23);
  const clippedHalfContent = await page.locator('.print-card-content').evaluateAll(contents =>
    contents.some(content => content.scrollHeight > content.clientHeight)
  );
  expect(clippedHalfContent).toBe(false);
  const halfCardPositions = await page.locator('.print-page').first().locator('.print-card').evaluateAll(cards =>
    cards.map(card => ({
      x: Math.round(card.getBoundingClientRect().x),
      y: Math.round(card.getBoundingClientRect().y),
    }))
  );
  expect(new Set(halfCardPositions.map(position => position.x)).size).toBe(2);
  expect(new Set(halfCardPositions.map(position => position.y)).size).toBe(1);
  await page.emulateMedia({ media: null });
  const halfPdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
  const halfPdfText = halfPdf.toString('latin1');
  const mediaBoxes = [...halfPdfText.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
  expect(pdfPageCount(halfPdf)).toBe(4);
  mediaBoxes.forEach(([, width, height]) => {
    expect(Number(width)).toBeGreaterThan(Number(height));
    expect(Number(width)).toBeGreaterThan(840);
    expect(Number(width)).toBeLessThan(843);
  });

  await page.locator('#halfOrientation').selectOption('portrait');
  await page.locator('#optLarge').check();
  await page.emulateMedia({ media: 'print' });
  const halfPortraitPageSize = await page.locator('.print-page').first().evaluate(element => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  expect(halfPortraitPageSize.width).toBeGreaterThan(790);
  expect(halfPortraitPageSize.width).toBeLessThan(800);
  expect(halfPortraitPageSize.height).toBeGreaterThan(1120);
  expect(halfPortraitPageSize.height).toBeLessThan(1130);
  const halfPortraitPositions = await page.locator('.print-page').first().locator('.print-card').evaluateAll(cards =>
    cards.map(card => ({
      x: Math.round(card.getBoundingClientRect().x),
      y: Math.round(card.getBoundingClientRect().y),
    }))
  );
  expect(new Set(halfPortraitPositions.map(position => position.x)).size).toBe(1);
  expect(new Set(halfPortraitPositions.map(position => position.y)).size).toBe(2);
  const largeHalfPortraitTypography = await page.locator('.print-page').first().evaluate(pageElement => ({
    question: Number.parseFloat(getComputedStyle(pageElement.querySelector('.print-card-question')).fontSize),
  }));
  largeHalfPortraitTypography.copy = await page.locator('.print-card-copy').first().evaluate(element =>
    Number.parseFloat(getComputedStyle(element).fontSize)
  );
  expect(largeHalfPortraitTypography.question).toBeGreaterThan(20);
  expect(largeHalfPortraitTypography.copy).toBeGreaterThan(14);
  const clippedLargeHalfPortrait = await page.locator('.print-card-content').evaluateAll(contents =>
    contents.some(content => content.scrollHeight > content.clientHeight)
  );
  expect(clippedLargeHalfPortrait).toBe(false);
  await page.emulateMedia({ media: null });
  const halfPortraitPdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
  const halfPortraitMediaBoxes = [...halfPortraitPdf.toString('latin1')
    .matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
  expect(pdfPageCount(halfPortraitPdf)).toBe(4);
  halfPortraitMediaBoxes.forEach(([, width, height]) => {
    expect(Number(width)).toBeLessThan(Number(height));
  });

  await page.locator('#cardSize').selectOption('full');
  await expect(page.locator('#fullOrientation')).toHaveValue('portrait');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-page').first().locator('.print-card')).toHaveCount(1);
  const portraitPageSize = await page.locator('.print-page').first().evaluate(element => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  expect(portraitPageSize.width).toBeLessThan(portraitPageSize.height);
  const fullCardSize = await page.locator('.print-card').first().evaluate(element => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  expect(fullCardSize.width).toBeGreaterThan(740);
  expect(fullCardSize.width).toBeLessThan(755);
  expect(fullCardSize.height).toBeGreaterThan(1075);
  expect(fullCardSize.height).toBeLessThan(1080);
  const fullTextSize = await page.locator('.print-card-question').first().evaluate(element =>
    Number.parseFloat(getComputedStyle(element).fontSize)
  );
  expect(fullTextSize).toBeGreaterThan(34);
  const clippedFullContent = await page.locator('.print-card-content').evaluateAll(contents =>
    contents.some(content => content.scrollHeight > content.clientHeight)
  );
  expect(clippedFullContent).toBe(false);

  await page.emulateMedia({ media: null });
  await page.locator('#optLarge').check();
  await page.emulateMedia({ media: 'print' });
  const largePortraitTypography = await page.locator('.print-page').first().evaluate(pageElement => ({
    question: Number.parseFloat(getComputedStyle(pageElement.querySelector('.print-card-question')).fontSize),
    contentPadding: Number.parseFloat(getComputedStyle(pageElement.querySelector('.print-card-content')).paddingTop),
  }));
  largePortraitTypography.copy = await page.locator('.print-card-copy').first().evaluate(element =>
    Number.parseFloat(getComputedStyle(element).fontSize)
  );
  expect(largePortraitTypography.question).toBeGreaterThan(45);
  expect(largePortraitTypography.copy).toBeGreaterThan(26);
  expect(largePortraitTypography.contentPadding).toBeGreaterThan(20);
  const clippedLargePortrait = await page.locator('.print-card-content').evaluateAll(contents =>
    contents.some(content => content.scrollHeight > content.clientHeight)
  );
  expect(clippedLargePortrait).toBe(false);

  await page.emulateMedia({ media: null });
  await page.locator('#fullOrientation').selectOption('landscape');
  await page.emulateMedia({ media: 'print' });
  const landscapePageSize = await page.locator('.print-page').first().evaluate(element => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  expect(landscapePageSize.width).toBeGreaterThan(landscapePageSize.height);
  const landscapeCardSize = await page.locator('.print-card').first().evaluate(element => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
  }));
  expect(landscapeCardSize.width).toBeGreaterThan(1075);
  expect(landscapeCardSize.height).toBeGreaterThan(740);
  const largeLandscapeTypography = await page.locator('.print-page').first().evaluate(pageElement => ({
    question: Number.parseFloat(getComputedStyle(pageElement.querySelector('.print-card-question')).fontSize),
  }));
  largeLandscapeTypography.copy = await page.locator('.print-card-copy').first().evaluate(element =>
    Number.parseFloat(getComputedStyle(element).fontSize)
  );
  expect(largeLandscapeTypography.question).toBeGreaterThan(39);
  expect(largeLandscapeTypography.copy).toBeGreaterThan(23);
  const clippedLargeLandscape = await page.locator('.print-card-content').evaluateAll(contents =>
    contents.some(content => content.scrollHeight > content.clientHeight)
  );
  expect(clippedLargeLandscape).toBe(false);
  await page.emulateMedia({ media: null });
  const fullLandscapePdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
  const fullLandscapeMediaBoxes = [...fullLandscapePdf.toString('latin1')
    .matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
  expect(pdfPageCount(fullLandscapePdf)).toBe(8);
  fullLandscapeMediaBoxes.forEach(([, width, height]) => {
    expect(Number(width)).toBeGreaterThan(Number(height));
  });
});
