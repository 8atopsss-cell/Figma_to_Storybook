import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import tokens from '../../src/tokens/icon-buttons.json' with { type: 'json' };

for (const theme of ['light', 'dark']) test(`IconButton ${theme}: all source and added geometry, token colors and assets`, async ({ page }) => {
  await page.goto(`/iframe.html?id=figma-export-iconbutton--${theme}&viewMode=story`);
  const rows = tokens.records.filter(r => r.theme === theme);
  await expect(page.locator('[data-mini-row]')).toHaveCount(32);
  for (const [i, row] of rows.entries()) {
    const root = page.locator('[data-mini-row]').nth(i).locator('[data-icon-button]');
    const box = (await root.boundingBox())!;
    expect(box.width).toBe(row.size); expect(box.height).toBe(row.size);
    for (const [selector, prefix] of [['[data-mini-background]', 'b'], ['[data-mini-glyph]', 'g']] as const) {
      const layer = root.locator(selector), rect = (await layer.boundingBox())!;
      const geometry = row.css as unknown as Record<string, number>;
      expect(rect.x - box.x).toBeCloseTo(geometry[prefix + 'x'], 1);
      expect(rect.y - box.y).toBeCloseTo(geometry[prefix + 'y'], 1);
      expect(rect.width).toBeCloseTo(geometry[prefix + 'w'], 1);
      expect(rect.height).toBeCloseTo(geometry[prefix + 'h'], 1);
    }
    const paints = await root.evaluate((button, css) => {
      const resolve = (value: string) => { const el = document.createElement('span'); button.appendChild(el); el.style.color = value; const color = getComputedStyle(el).color; el.remove(); return color; };
      return { expectedBackground: resolve(css.background), expectedColor: resolve(css.color), background: getComputedStyle(button.querySelector('[data-mini-background]')!).backgroundColor, color: getComputedStyle(button).color, mask: getComputedStyle(button.querySelector('[data-mini-glyph]')!).maskImage };
    }, row.css);
    expect(paints.background).toBe(paints.expectedBackground);
    expect(paints.color).toBe(paints.expectedColor);
    const assetUrl = paints.mask.match(/url\("(.+)"\)/)![1];
    const asset = await page.evaluate(async url => { const response = await fetch(url); return { ok: response.ok, svg: await response.text() }; }, assetUrl);
    expect(asset.ok).toBe(true); expect(asset.svg).toContain('<path');
    expect(await root.isDisabled()).toBe(row.state === 'disable');
  }
  await page.screenshot({ path: `artifacts/browser/icon-button-${theme}.png`, fullPage: true });
  const report = await new AxeBuilder({ page }).include('.demo-surface').analyze();
  fs.writeFileSync(`artifacts/browser/a11y-icon-button-${theme}.json`, JSON.stringify(report, null, 2));
  expect(report.violations.filter(v => v.id !== 'color-contrast')).toEqual([]);
});
test('IconButton native hover/press use Button timings, keyboard focus and disabled state', async ({ page }) => {
  await page.goto('/iframe.html?id=figma-export-iconbutton--playground&viewMode=story');
  const button = page.getByRole('button', { name: 'Выполнить действие' }), bg = button.locator('[data-mini-background]');
  await expect(bg).toHaveCSS('background-color', 'rgb(255, 87, 34)');
  await button.hover();
  await expect(bg).toHaveCSS('transition-duration', '0.3s');
  await expect(bg).toHaveCSS('transition-timing-function', 'cubic-bezier(0.656, 0.003, 0.355, 1)');
  await expect(bg).toHaveCSS('background-color', 'rgb(255, 112, 67)');
  await page.mouse.down();
  await expect(bg).toHaveCSS('transition-duration', '0.07s');
  await expect(bg).toHaveCSS('background-color', 'rgb(230, 74, 25)');
  await page.mouse.up();
  await expect(bg).toHaveCSS('transition-duration', '0.3s');
  await page.goto('/iframe.html?id=figma-export-iconbutton--playground&viewMode=story');
  await expect(button).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS('outline-width', '2px');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(bg).toHaveCSS('transition-property', 'none');
  await page.goto('/iframe.html?id=figma-export-iconbutton--playground&viewMode=story&args=disabled:true');
  await expect(page.getByRole('button')).toBeDisabled();
});
