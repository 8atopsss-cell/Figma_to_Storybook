import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import tokens from '../../src/tokens/menu-buttons.json' with { type: 'json' };
import badges from '../../src/tokens/badges.json' with { type: 'json' };

function color(paints: { visible?: boolean; color: { r: number; g: number; b: number }; opacity: number }[]) {
  const p = paints.find(p => p.visible !== false);
  return p ? `rgb(${Math.round(p.color.r * 255)}, ${Math.round(p.color.g * 255)}, ${Math.round(p.color.b * 255)})` : 'rgba(0, 0, 0, 0)';
}
for (const theme of ['light', 'dark'] as const) {
  test(`MenuButton ${theme}: all source geometry, typography and paints`, async ({ page }) => {
    await page.goto(`/iframe.html?id=figma-export-menubutton--${theme}&viewMode=story`);
    await expect(page.locator('[data-menu-button]')).toHaveCount(3);
    await page.evaluate(() => document.fonts.ready);
    for (const row of tokens.records.filter(r => r.theme === theme)) {
      const root = page.locator(`[data-menu-button][data-source-node="${row.nodeId}"]`);
      const content = row.source.children.find(c => c.name === 'Content')!;
      const text = content.children!.find(c => c.type === 'TEXT')!;
      const icon = content.children!.find(c => c.type === 'INSTANCE')!;
      const label = root.locator('[data-source-text]');
      const iconElement = root.locator('[aria-hidden="true"]').first();
      const box = (await root.boundingBox())!;
      expect(box.width).toBeCloseTo(row.source.width, 1);
      expect(box.height).toBe(row.source.height);
      await expect(root).toHaveCSS('background-color', color(row.source.properties.fills));
      await expect(root).toHaveCSS('border-radius', '3px');
      await expect(label).toHaveCSS('color', color(text.properties.fills));
      await expect(label).toHaveCSS('font-size', `${text.properties.fontSize}px`);
      await expect(label).toHaveCSS('font-weight', theme === 'dark' && row.state === 'default' ? '400' : '500');
      await expect(label).toHaveCSS('line-height', '18px');
      await expect(iconElement).toHaveCSS('background-color', color(icon.children![0].properties.fills));
      const iconBox = (await iconElement.boundingBox())!;
      expect(iconBox.width).toBe(icon.width);
      expect(iconBox.height).toBe(icon.height);
      const textBox = (await label.boundingBox())!;
      expect(textBox.x - box.x).toBe(text.x + content.x);
      expect(textBox.y - box.y).toBe(text.y + content.y);
    }
    const report = await new AxeBuilder({ page }).include('.demo-surface').analyze();
    fs.writeFileSync(`artifacts/browser/a11y-menu-button-${theme}.json`, JSON.stringify(report, null, 2));
    await page.screenshot({ path: `artifacts/browser/menu-button-${theme}.png`, fullPage: true });
    expect(report.violations.filter(v => v.id !== 'color-contrast')).toEqual([]);
  });
  test(`MenuButton ${theme}: native hover/active and theme-specific badge`, async ({ page }) => {
    await page.goto(`/iframe.html?id=figma-export-menubutton--playground&viewMode=story&globals=theme:${theme}&args=badge:true`);
    const button = page.getByRole('button', { name: 'Ключевые контейнеры' });
    await expect(button).toHaveAttribute('data-menu-theme', theme);
    await expect(button.locator('[data-badge]')).toHaveAttribute('data-badge-theme', theme);
    await expect(button.locator('ellipse')).toHaveCount(1);
    for (const state of ['default', 'hover', 'active']) {
      const row = tokens.records.find(r => r.theme === theme && r.state === state)!;
      if (state === 'hover') await button.hover();
      if (state === 'active') await page.mouse.down();
      await expect(button).toHaveCSS('background-color', color(row.source.properties.fills));
      if (row.badge) {
        const badge = badges.records.find(r => r.theme === theme && r.variant === 'medium')!;
        const shape = badge.source.children[0];
        const ellipse = button.locator('ellipse');
        await expect(ellipse).toHaveCSS('fill', color(shape.properties.fills));
        await expect(ellipse).toHaveCSS('stroke', color(shape.properties.strokes));
        await expect(ellipse).toHaveCSS('stroke-width', '2px');
      }
    }
    await page.mouse.up();
    await button.focus();
    await expect(button).toBeFocused();
  });
}
