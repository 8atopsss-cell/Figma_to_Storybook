import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import tokens from '../../src/tokens/checkboxes.json' with { type: 'json' };

const normalizeSvg = (svg: string) => svg.replace(/'/g, '"').replace(/>\s+</g, '><').trim();

for (const theme of ['light', 'dark']) test(`Checkbox ${theme}: source states, SVG and text geometry`, async ({ page }) => {
  await page.goto(`/iframe.html?id=figma-export-checkbox--${theme}&viewMode=story`);
  await expect(page.locator('[data-state]')).toHaveCount(7);
  await page.evaluate(() => document.fonts.ready);
  const rows = tokens.records.filter(r => r.theme === theme && r.scope === 'labelled');
  for (const record of rows) {
    const state = record.sourceState === 'Variant7' ? 'indeterminate' : record.sourceState;
    const root = page.locator(`[data-state="${state}"] [data-checkbox]`);
    const node = record.source;
    const rect = await root.boundingBox();
    expect(rect!.height).toBe(node.height);
    // Source text box is 98px; browser glyph advance is 97.296875px with the supplied font.
    expect(Math.ceil(rect!.width)).toBe(node.width);
    const visualState = state === 'indeterminate' ? 'mixed' : state === 'selected' || state === 'disabled selected' ? 'selected' : 'empty';
    const visual = state === 'skeleton' ? root.locator('span').first() : root.locator(`[data-checkbox-visual="${visualState}"]`);
    if (state === 'hover') await root.hover();
    if (state !== 'skeleton') await expect(visual).toHaveCSS('opacity', '1');
    const image = await visual.evaluate(n => getComputedStyle(n).backgroundImage);
    const asset = tokens.assets.find(a => a.nodeId === node.children[0].id)!;
    const url = image.match(/url\("(.+)"\)/)![1];
    const svg = await page.evaluate(async url => (await fetch(url)).text(), url);
    expect(normalizeSvg(svg)).toBe(normalizeSvg(fs.readFileSync(asset.path, 'utf8')));
    const actual = await root.evaluate(n => {
      const css = getComputedStyle(n);
      return { gap: parseFloat(css.gap), font: css.fontFamily, size: parseFloat(css.fontSize), weight: Number(css.fontWeight), line: parseFloat(css.lineHeight), spacing: parseFloat(css.letterSpacing), color: css.color };
    });
    expect(actual.gap).toBe(node.properties.itemSpacing);
    const text = node.children.find(n => n.type === 'TEXT');
    if (text && 'fontName' in text.properties && 'fontSize' in text.properties && 'lineHeight' in text.properties && 'letterSpacing' in text.properties) {
      expect(actual.font).toContain(text.properties.fontName!.family);
      expect(actual.size).toBe(text.properties.fontSize);
      expect(actual.weight).toBe(500);
      expect(actual.line).toBe(text.properties.lineHeight!.value);
      expect(actual.spacing).toBeCloseTo(text.properties.letterSpacing!.value, 4);
      const paint = text.properties.fills![0];
      expect(actual.color).toBe(`rgb(${[paint.color.r, paint.color.g, paint.color.b].map(c => Math.round(c * 255)).join(', ')})`);
    }
  }
  for (const state of ['enable', 'selected', 'indeterminate', 'disabled unselected', 'disabled selected']) {
    const visualState = state === 'indeterminate' ? 'mixed' : state === 'selected' || state === 'disabled selected' ? 'selected' : 'empty';
    const visual = page.locator(`[data-icon-state="${state}"] [data-checkbox-visual="${visualState}"]`);
    await expect(visual).toHaveCSS('opacity', '1');
    const image = await visual.evaluate(n => getComputedStyle(n).backgroundImage);
    const sourceState = state === 'indeterminate' ? 'Indeterminate' : state === 'disabled unselected' ? 'Disable' : state;
    const asset = tokens.assets.find(a => a.theme === theme && a.scope === 'icon' && a.state === sourceState)!;
    const svg = await page.evaluate(async url => (await fetch(url)).text(), image.match(/url\("(.+)"\)/)![1]);
    expect(normalizeSvg(svg)).toBe(normalizeSvg(fs.readFileSync(asset.path, 'utf8')));
  }
  await page.mouse.move(0, 0);
  await page.screenshot({ path: `artifacts/browser/checkbox-${theme}.png` });
  const report = await new AxeBuilder({ page }).include('.demo-surface').analyze();
  fs.writeFileSync(`artifacts/browser/a11y-checkbox-${theme}.json`, JSON.stringify(report, null, 2));
  expect(report.violations.filter(v => v.id !== 'color-contrast')).toEqual([]);
});

test('Checkbox controls switch mixed state and keyboard activation; disabled blocks clicks', async ({ page }) => {
  await page.goto('/iframe.html?id=figma-export-checkbox--indeterminate&viewMode=story');
  const input = page.getByRole('checkbox', { name: 'Checkbox item' });
  await expect(input).toHaveJSProperty('indeterminate', true);
  await input.focus();
  await page.keyboard.press('Space');
  await expect(input).toBeChecked();
  await expect(input).toHaveJSProperty('indeterminate', false);
  await page.keyboard.press('Space');
  await expect(input).not.toBeChecked();
  await page.goto('/iframe.html?id=figma-export-checkbox--disabled-selected&viewMode=story');
  await expect(page.getByRole('checkbox')).toBeDisabled();
  await page.getByText('Checkbox item', { exact: true }).click({ force: true });
  await expect(page.getByRole('checkbox')).toBeChecked();
});

test('Checkbox groups keep source spacing and native group names', async ({ page }) => {
  await page.goto('/iframe.html?id=figma-export-checkbox--groups&viewMode=story');
  await expect(page.getByRole('group', { name: 'Label' })).toHaveCount(4);
  const group = page.getByRole('group').last();
  await expect(group.getByRole('checkbox')).toHaveCount(5);
  expect((await group.boundingBox())!.height).toBe(148);
  const rows = await group.locator('[data-checkbox]').all();
  for (let i = 1; i < rows.length; i++) {
    const previous = (await rows[i - 1].boundingBox())!;
    expect((await rows[i].boundingBox())!.y - previous.y - previous.height).toBe(8);
  }
  await page.screenshot({ path: 'artifacts/browser/checkbox-groups.png' });
});

test('Checkbox fades between empty, checked and mixed for 200ms and respects reduced motion', async ({ page }) => {
  await page.goto('/iframe.html?id=figma-export-checkbox--playground&viewMode=story');
  const root = page.locator('[data-checkbox]');
  await expect(root.locator('[data-checkbox-visual="empty"]')).toHaveCSS('opacity', '1');
  for (const state of ['selected', 'empty', 'mixed', 'selected', 'mixed', 'empty']) {
    const actual = await root.evaluate((node, state) => {
      const input = node.querySelector('input')!;
      const visuals = Array.from(node.querySelectorAll<HTMLElement>('[data-checkbox-visual]'));
      visuals.forEach(visual => { void getComputedStyle(visual).opacity; });
      input.checked = state === 'selected';
      input.indeterminate = state === 'mixed';
      visuals.forEach(visual => { void getComputedStyle(visual).opacity; });
      const animations = node.getAnimations({ subtree: true });
      const timings = animations.map(animation => animation.effect!.getTiming());
      animations.forEach(animation => { animation.pause(); animation.currentTime = 100; });
      const target = node.querySelector(`[data-checkbox-visual="${state}"]`)!;
      const middle = Number(getComputedStyle(target).opacity);
      animations.forEach(animation => animation.finish());
      return { timings, middle, end: Number(getComputedStyle(target).opacity) };
    }, state);
    expect(actual.timings.length).toBe(2);
    for (const timing of actual.timings) {
      expect(timing.duration).toBe(200);
      expect(timing.delay).toBe(0);
      expect(timing.easing).toBe('cubic-bezier(0.656, 0.003, 0.355, 1)');
    }
    expect(actual.middle).toBeGreaterThan(0);
    expect(actual.middle).toBeLessThan(1);
    expect(actual.end).toBe(1);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('checkbox').click();
  await expect(root.locator('[data-checkbox-visual="selected"]')).toHaveCSS('opacity', '1');
  await expect(root.locator('[data-checkbox-visual="selected"]')).toHaveCSS('transition-duration', '0s');
});
