import { test, expect } from '@playwright/test';
import tokens from '../../src/tokens/styles.json' with { type: 'json' };

test('all 184 color tokens render with the source opacity', async ({ page }) => {
  await page.goto('/iframe.html?id=tokens-colors--catalogue&viewMode=story');
  await expect(page.locator('[data-color-style]')).toHaveCount(tokens.colors.length);
  for (const token of tokens.colors) {
    const swatch = page.locator(`[data-color-style="${token.id}"] [data-swatch]`);
    const actual = await swatch.evaluate(node => getComputedStyle(node).backgroundColor);
    const channels = actual.match(/[\d.]+/g)!.map(Number);
    const source = token.raw.paints[0];
    expect(channels.slice(0, 3)).toEqual([source.color.r, source.color.g, source.color.b].map(value => Math.round(value * 255)));
    // Chromium serializes alpha through an 8-bit channel; the declared token keeps the raw float.
    expect(Math.abs((channels[3] ?? 1) - source.opacity)).toBeLessThanOrEqual(1 / 255);
    expect(await swatch.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name).trim(), token.cssVariable)).toBe(token.value);
  }
  await page.screenshot({ path: 'artifacts/browser/style-colors.png' });
  await page.goto('/iframe.html?id=tokens-colors--catalogue&viewMode=story&args=theme:dark;search:dark_text');
  await expect(page.locator('[data-color-style]')).toHaveCount(tokens.colors.filter(token => token.theme === 'dark' && token.name.includes('dark_text')).length);
});

test('all 12 text styles render with the loaded source font and metrics', async ({ page }) => {
  await page.goto('/iframe.html?id=tokens-typography--catalogue&viewMode=story');
  await expect(page.locator('[data-text-style]')).toHaveCount(tokens.typography.length);
  await page.evaluate(() => document.fonts.ready);
  for (const token of tokens.typography) {
    const sample = page.locator('.' + token.className);
    const actual = await sample.evaluate(node => {
      const css = getComputedStyle(node);
      return { size: parseFloat(css.fontSize), lineHeight: parseFloat(css.lineHeight), letterSpacing: css.letterSpacing === 'normal' ? 0 : parseFloat(css.letterSpacing), weight: Number(css.fontWeight), family: css.fontFamily, textTransform: css.textTransform, paragraphSpacing: parseFloat(getComputedStyle(node.children[1]).marginTop) };
    });
    const raw = token.raw;
    expect(actual.family).toContain(raw.fontName.family);
    expect(actual.size).toBe(raw.fontSize);
    expect(actual.weight).toBe(token.css['font-weight']);
    expect(actual.lineHeight).toBeCloseTo(raw.properties.lineHeight.unit === 'PIXELS' ? raw.properties.lineHeight.value : raw.fontSize * raw.properties.lineHeight.value / 100, 3);
    expect(actual.letterSpacing).toBeCloseTo(raw.properties.letterSpacing.unit === 'PIXELS' ? raw.properties.letterSpacing.value : raw.fontSize * raw.properties.letterSpacing.value / 100, 3);
    expect(actual.paragraphSpacing).toBe(raw.properties.paragraphSpacing);
    expect(actual.textTransform).toBe(token.css['text-transform']);
    expect(await page.evaluate(({ weight, size }) => document.fonts.check(`${weight} ${size}px "PT Root UI"`), { weight: actual.weight, size: actual.size })).toBe(true);
  }
  await page.screenshot({ path: 'artifacts/browser/style-typography.png' });
  await page.goto('/iframe.html?id=tokens-typography--catalogue&viewMode=story&args=text:Sample');
  await expect(page.locator('[data-text-sample] > p').first()).toHaveText('Sample');
});
