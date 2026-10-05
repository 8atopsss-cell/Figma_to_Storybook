import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import tags from '../../src/tokens/resource-tags.json' with { type: 'json' };
import badges from '../../src/tokens/badges.json' with { type: 'json' };

for (const theme of ['light', 'dark'] as const) {
  test(`ResourceTag ${theme}: source geometry and online/offline badges`, async ({ page }) => {
    await page.goto(`/iframe.html?id=figma-export-resourcetag--${theme}&viewMode=story`);
    await page.evaluate(() => document.fonts.ready);
    for (const row of tags.records.filter(r => r.theme === theme)) {
      const examples = page.locator(`[data-resource-tag][data-source-node="${row.nodeId}"]`);
      await expect(examples).toHaveCount(row.statusPropertyId ? 3 : 1);
      const base = examples.first();
      const box = (await base.boundingBox())!;
      expect(box.width).toBe(row.source.width);
      expect(box.height).toBe(row.source.height);
      await expect(base).toHaveCSS('border-radius', '12px');
      if (row.statusPropertyId) {
        const offline = examples.filter({ has: page.locator('[aria-hidden="true"]') }).last();
        await expect(offline).toHaveAttribute('data-status-state', 'offline');
        const dot = offline.locator('[aria-hidden="true"] > span');
        const source = tags.offlineBadges[theme].source.children[0].properties.fills[0].color;
        await expect(dot).toHaveCSS('background-color', `rgb(${Math.round(source.r * 255)}, ${Math.round(source.g * 255)}, ${Math.round(source.b * 255)})`);
      }
    }
    const report = await new AxeBuilder({ page }).include('.demo-surface').analyze();
    fs.writeFileSync(`artifacts/browser/a11y-resource-tag-${theme}.json`, JSON.stringify(report, null, 2));
    await page.screenshot({ path: `artifacts/browser/resource-tag-${theme}.png`, fullPage: true });
    expect(report.violations.filter(v => v.id !== 'color-contrast')).toEqual([]);
  });
  test(`Badge ${theme}: source geometry and centred strokes`, async ({ page }) => {
    await page.goto(`/iframe.html?id=figma-export-badge--${theme}&viewMode=story`);
    await page.evaluate(() => document.fonts.ready);
    for (const row of badges.records.filter(r => r.theme === theme)) {
      const root = page.locator(`[data-badge][data-source-node="${row.nodeId}"]`);
      const box = (await root.boundingBox())!;
      expect(box.width).toBeCloseTo(row.source.width, 0);
      expect(box.height).toBe(row.source.height);
      for (const [i, shape] of row.shapes.entries()) {
        const ellipse = root.locator('ellipse').nth(i);
        await expect(ellipse).toHaveAttribute('stroke-width', String(shape.strokeWidth));
        await expect(ellipse).toHaveAttribute('rx', String(shape.width / 2));
      }
    }
    const report = await new AxeBuilder({ page }).include('.demo-surface').analyze();
    fs.writeFileSync(`artifacts/browser/a11y-badge-${theme}.json`, JSON.stringify(report, null, 2));
    await page.screenshot({ path: `artifacts/browser/badge-${theme}.png`, fullPage: true });
    expect(report.violations.filter(v => v.id !== 'color-contrast')).toEqual([]);
  });
}

test('all components have one Playground plus Light/Dark; global theme changes the component', async ({ page, request }) => {
  const response = await request.get('/index.json');
  const index = await response.json();
  for (const component of ['button', 'iconbutton', 'checkbox', 'toggle', 'resourcetag', 'badge']) {
    const stories = Object.values(index.entries).filter((entry: unknown) => {
      const e = entry as { id: string; type: string };
      return e.type === 'story' && e.id.startsWith(`figma-export-${component}--`);
    }).map(entry => (entry as { id: string }).id.split('--')[1]).sort();
    expect(stories).toEqual(['dark', 'light', 'playground']);
  }
  for (const theme of ['light', 'dark']) {
    await page.goto(`/iframe.html?id=figma-export-resourcetag--playground&viewMode=story&globals=theme:${theme}`);
    await expect(page.locator('[data-resource-tag]')).toHaveAttribute('data-tag-theme', theme);
    await page.goto(`/iframe.html?id=figma-export-badge--playground&viewMode=story&globals=theme:${theme}`);
    await expect(page.locator('[data-badge]')).toHaveAttribute('data-badge-theme', theme);
    await page.goto(`/iframe.html?id=figma-export-toggle--playground&viewMode=story&globals=theme:${theme}`);
    await expect(page.locator('[data-toggle-variant]')).toHaveAttribute('data-toggle-variant', `disable ${theme}`);
  }
});
