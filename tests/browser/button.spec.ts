import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import tokens from '../../src/tokens/buttons.json' with { type: 'json' };
import source from '../../source/figma/fresh-export.json' with { type: 'json' };
const output = 'artifacts/browser';
fs.mkdirSync(output, { recursive: true });

type Paint = { visible: boolean; opacity: number; color?: { r: number; g: number; b: number } };
function color(paints: Paint[]) {
  const visible = paints.find(p => p.visible);
  if (!visible) return 'rgba(0, 0, 0, 0)';
  const rgb = [visible.color!.r, visible.color!.g, visible.color!.b].map(c => Math.round(c * 255)).join(', ');
  return visible.opacity === 1 ? 'rgb(' + rgb + ')' : 'rgba(' + rgb + ', ' + visible.opacity + ')';
}
async function openStory(page: Page, story: string) {
  await page.goto('/iframe.html?id=figma-export-button--' + story + '&viewMode=story');
  await expect(page.locator('[data-button]').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
const mapping: unknown[] = [];

for (const theme of ['light', 'dark'] as const) {
  test(theme + ': all 48 Figma states agree with browser CSS', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStory(page, theme);
    await expect(page.locator('[data-button]')).toHaveCount(24);
    const family = await page.locator('[data-button]').first().evaluate(node => getComputedStyle(node).fontFamily);
    expect(family).toContain('PT Root UI');
    expect(await page.evaluate(() => document.fonts.check('700 14px "PT Root UI"'))).toBe(true);
    for (const row of tokens.records.filter(r => r.theme === theme)) {
      const original = source[theme].children.find(n => n.id === row.nodeId)!;
      const p = original.properties;
      const label = original.children.find(n => n.type === 'TEXT')!;
      const selector = '[data-button][data-variant="' + row.variant + '"][data-size="' + row.size + '"]' + (row.state === 'disable' ? ':disabled' : ':not(:disabled)');
      const button = page.locator(selector);
      await page.mouse.move(0, 0);
      if (row.state === 'hover' || row.state === 'active') await button.hover();
      if (row.state === 'active') await page.mouse.down();
      const actual = await button.evaluate(node => {
        const s = getComputedStyle(node);
        const text = getComputedStyle(node.querySelector('span:not([aria-hidden])')!);
        const box = node.getBoundingClientRect();
        return {
          background: s.backgroundColor, color: s.color, radii: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius],
          padding: [s.paddingLeft, s.paddingRight, s.paddingTop, s.paddingBottom], gap: s.gap,
          fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing,
          textTransform: s.textTransform, featureSettings: s.fontFeatureSettings, opacity: s.opacity, textOpacity: text.opacity,
          shadow: s.boxShadow, height: box.height, width: box.width,
        };
      });
      if (row.state === 'active') await page.mouse.up();
      expect(actual.background, row.nodeId + ' fills').toBe(color(p.fills));
      expect(actual.color, row.nodeId + ' label').toBe(color(label.properties.fills));
      expect(actual.radii, row.nodeId + ' corners').toEqual([p.topLeftRadius, p.topRightRadius, p.bottomRightRadius, p.bottomLeftRadius].map(v => v + 'px'));
      expect(actual.padding).toEqual([p.paddingLeft, p.paddingRight, p.paddingTop, p.paddingBottom].map(v => v + 'px'));
      expect(actual.gap).toBe(p.itemSpacing + 'px');
      expect(actual.fontSize).toBe(label.properties.fontSize + 'px');
      expect(actual.fontWeight).toBe(String(label.textSegments![0].fontWeight));
      expect(actual.lineHeight).toBe(label.properties.lineHeight!.value + 'px');
      expect(actual.letterSpacing).toBe(label.properties.letterSpacing!.value + 'px');
      expect(actual.textTransform).toBe('uppercase');
      expect(actual.featureSettings).toContain('"case"');
      expect(actual.featureSettings).toContain('"liga" 0');
      expect(actual.opacity).toBe(String(p.opacity));
      expect(actual.textOpacity).toBe(String(label.properties.opacity));
      const stroke = p.strokes.find(s => s.visible);
      if (stroke) {
        expect(actual.shadow).toContain(color([stroke]));
        expect(actual.shadow).toContain(p.strokeWeight + 'px');
      } else expect(actual.shadow).toContain('rgba(0, 0, 0, 0)');
      expect(actual.height).toBe(row.size);
      // Figma input uses the same font, label and actual exported 16px icon.
      expect(actual.width).toBeCloseTo(original.width, 0);
      mapping.push({ nodeId: row.nodeId, theme, variant: row.variant, state: row.state, originalHeight: original.height, actual });
    }
    await page.mouse.move(0, 0);
    await page.screenshot({ path: output + '/' + theme + '.png', fullPage: true });
    fs.writeFileSync(output + '/source-vs-css-' + theme + '.json', JSON.stringify(mapping.filter((r: unknown) => (r as { theme: string }).theme === theme), null, 2));
  });

  test(theme + ': record complete accessibility audit', async ({ page }) => {
    await openStory(page, theme);
    const result = await new AxeBuilder({ page }).include('.demo-surface').analyze();
    const contrastChecks = [...result.passes, ...result.violations, ...result.incomplete]
      .filter(check => check.id === 'color-contrast').flatMap(check => check.nodes)
      .filter(node => node.target.join('').includes('data-variant'));
    expect(contrastChecks).toHaveLength(12);
    fs.writeFileSync(output + '/a11y-' + theme + '.json', JSON.stringify(result, null, 2));
    fs.writeFileSync(output + '/a11y-summary-' + theme + '.json', JSON.stringify(result.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), null, 2));
    expect(result.violations.filter(v => v.id !== 'color-contrast')).toEqual([]);
  });
}

test('background uses 300ms on hover and 70ms on press with the custom easing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openStory(page, 'playground');
  await page.mouse.move(0, 0);
  const button = page.locator('[data-button]');
  const initial = await button.evaluate(node => getComputedStyle(node).backgroundColor);
  const motion = await button.evaluate(node => {
    const s = getComputedStyle(node);
    return { property: s.transitionProperty, duration: s.transitionDuration, easing: s.transitionTimingFunction };
  });
  expect(motion).toEqual({ property: 'background-color', duration: '0.3s', easing: 'cubic-bezier(0.656, 0.003, 0.355, 1)' });
  const finishTransition = () => button.evaluate(async node => {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await Promise.all(node.getAnimations().map(animation => animation.finished));
  });
  await button.hover();
  await finishTransition();
  const hovered = await button.evaluate(node => getComputedStyle(node).backgroundColor);
  expect(hovered).not.toBe(initial);
  await page.mouse.down();
  expect(await button.evaluate(node => getComputedStyle(node).transitionDuration)).toBe('0.07s');
  await finishTransition();
  expect(await button.evaluate(node => getComputedStyle(node).backgroundColor)).not.toBe(hovered);
  await page.mouse.up();
  expect(await button.evaluate(node => getComputedStyle(node).transitionDuration)).toBe('0.3s');
  await finishTransition();
  expect(await button.evaluate(node => getComputedStyle(node).backgroundColor)).toBe(hovered);
  await page.mouse.move(0, 0);
  await finishTransition();
  expect(await button.evaluate(node => getComputedStyle(node).backgroundColor)).toBe(initial);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await button.evaluate(node => getComputedStyle(node).transitionDuration)).toBe('0s');
  await button.hover();
  await page.mouse.down();
  expect(await button.evaluate(node => getComputedStyle(node).transitionDuration)).toBe('0s');
  await page.mouse.up();
});

test('keyboard activation, focus ring and disabled behavior', async ({ page }) => {
  await openStory(page, 'playground');
  const button = page.getByRole('button', { name: 'button' });
  await page.keyboard.press('Tab');
  await expect(button).toBeFocused();
  expect(await button.evaluate(node => getComputedStyle(node).outlineStyle)).toBe('solid');
  expect(await button.evaluate(node => getComputedStyle(node).outlineWidth)).toBe('2px');
  await button.screenshot({ path: output + '/focus.png' });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(page.locator('output')).toHaveText('Нажатий: 2');
  await page.goto('/iframe.html?id=figma-export-button--playground&viewMode=story&args=disabled:true');
  await expect(page.locator('[data-button]')).toBeDisabled();
  await page.keyboard.press('Tab');
  expect(await page.locator('[data-button]').evaluate(node => node === document.activeElement)).toBe(false);
  await expect(page.locator('output')).toHaveText('Нажатий: 0');
});

test('long text stays fully visible on one line and fullWidth follows its container', async ({ page }) => {
  await openStory(page, 'long-text');
  const button = page.locator('[data-button]');
  const sizes = await button.evaluate(node => ({ height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }));
  expect(sizes.height).toBe(32);
  expect(sizes.width).toBeGreaterThan(160);
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth);
  const label = button.locator('span:not([aria-hidden])');
  expect(await label.evaluate(node => node.getBoundingClientRect().height)).toBe(18);
  expect(await label.evaluate(node => node.scrollWidth)).toBeLessThanOrEqual(await label.evaluate(node => node.clientWidth));
  await openStory(page, 'full-width');
  expect(await page.locator('[data-button]').evaluate(node => node.getBoundingClientRect().width)).toBe(1286);
});

test('public component works outside Storybook', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174');
  await page.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.locator('output')).toHaveText('Нажатий: 1');
  expect(await page.locator('[data-button]').evaluate(node => getComputedStyle(node).borderRadius)).toBe('2px');
});

test('public import preserves the host page layout and typography', async ({ page }) => {
  await page.goto('http://127.0.0.1:5174/tests/browser/host.html');
  const readHost = () => page.evaluate(() => {
    const body = getComputedStyle(document.body);
    return { margin: body.margin, font: body.fontFamily, boxSizing: getComputedStyle(document.getElementById('host')!).boxSizing };
  });
  const original = await readHost();
  await page.evaluate(async () => {
    const entry = '/src/index.ts';
    await import(entry);
  });
  expect(await readHost()).toEqual(original);
});
