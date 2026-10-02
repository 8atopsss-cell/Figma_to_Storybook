import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import tokens from '../../src/tokens/toggles.json' with { type: 'json' };

for (const theme of ['light', 'dark']) test(`Toggle ${theme}: all source geometry and colors`, async ({ page }) => {
  await page.goto(`/iframe.html?id=figma-export-toggle--${theme}&viewMode=story`);
  const rows = tokens.records.filter(row => row.theme === theme);
  await expect(page.locator('[data-toggle-source]')).toHaveCount(rows.length);
  for (const row of rows) {
    const root = page.locator(`[data-toggle-source="${row.nodeId}"] [data-toggle-variant]`);
    const box = (await root.boundingBox())!;
    expect(box.width).toBe(row.source.width);
    expect(box.height).toBe(row.source.height);
    for (const [kind, source] of [['track', row.source.children[0]], ['thumb', row.source.children[1]]] as const) {
      const layer = root.locator(`[data-toggle-${kind}]`);
      const rect = (await layer.boundingBox())!;
      expect(rect.x - box.x).toBe(source.x);
      expect(rect.y - box.y).toBe(source.y);
      expect(rect.width).toBe(source.width);
      expect(rect.height).toBe(source.height);
      const css = await layer.evaluate(n => ({ color: getComputedStyle(n).backgroundColor, radius: getComputedStyle(n).borderRadius }));
      const paint = source.properties.fills[0];
      expect(css.color).toBe(`rgb(${[paint.color.r, paint.color.g, paint.color.b].map(x => Math.round(x * 255)).join(', ')})`);
      expect(css.radius).toBe(kind === 'track' ? '43px' : '50%');
    }
    const input = root.getByRole('switch');
    expect(await input.isChecked()).toBe(row.checked);
    expect(await input.isDisabled()).toBe(row.disabled);
  }
  await page.screenshot({ path: `artifacts/browser/toggle-${theme}.png` });
  const report = await new AxeBuilder({ page }).include('.demo-surface').analyze();
  fs.writeFileSync(`artifacts/browser/a11y-toggle-${theme}.json`, JSON.stringify(report, null, 2));
  expect(report.violations.filter(v => v.id !== 'color-contrast')).toEqual([]);
});

test('Toggle Playground switches with keyboard and retains source variant controls', async ({ page }) => {
  await page.goto('/iframe.html?id=figma-export-toggle--playground&viewMode=story');
  const input = page.getByRole('switch', { name: 'Переключить параметр' });
  await expect(input).not.toBeChecked();
  await input.focus();
  await expect(page.locator('[data-toggle-variant]')).toHaveCSS('outline-width', '2px');
  await page.keyboard.press('Space');
  await expect(input).toBeChecked();
  await expect(page.locator('[data-toggle-variant]')).toHaveAttribute('data-toggle-variant', 'Enable dark');
  await input.click();
  await expect(input).not.toBeChecked();
  await page.goto('/iframe.html?id=figma-export-toggle--playground&viewMode=story&args=variant:enable%20light');
  await expect(page.getByRole('switch')).toBeChecked();
  await expect(page.locator('[data-toggle-variant]')).toHaveAttribute('data-toggle-variant', 'enable light');
  await page.goto('/iframe.html?id=figma-export-toggle--disabled-on&viewMode=story');
  await expect(page.getByRole('switch')).toBeDisabled();
  await page.getByRole('switch').click({ force: true });
  await expect(page.getByRole('switch')).toBeChecked();
});

for (const story of ['danger', 'playground&args=variant:Enable%20danger%20dark']) test(`Toggle ${story}: danger remains red after repeated off/on`, async ({ page }) => {
  await page.goto(`/iframe.html?id=figma-export-toggle--${story}&viewMode=story`);
  const input = page.getByRole('switch');
  const root = page.locator('[data-toggle-variant]');
  for (let cycle = 0; cycle < 3; cycle++) {
    await expect(input).toBeChecked();
    await expect(root.locator('[data-toggle-thumb]')).toHaveCSS('background-color', 'rgb(249, 71, 74)');
    await input.click();
    await expect(input).not.toBeChecked();
    await expect(root).toHaveAttribute('data-toggle-variant', 'disable dark');
    await input.focus();
    await page.keyboard.press('Space');
    await expect(input).toBeChecked();
    await expect(root).toHaveAttribute('data-toggle-variant', 'Enable danger dark');
    await expect(root.locator('[data-toggle-thumb]')).toHaveCSS('background-color', 'rgb(249, 71, 74)');
  }
});

for (const enabled of ['Enable dark', 'Enable danger dark', 'enable light']) test(`Toggle ${enabled}: thumb moves for 200ms with Uiverse ease`, async ({ page }) => {
  const off = enabled.endsWith('light') ? 'disable light' : 'disable dark';
  await page.goto(`/iframe.html?id=figma-export-toggle--playground&viewMode=story&args=variant:${encodeURIComponent(off)}`);
  const root = page.locator('[data-toggle-variant]');
  await expect(root).toHaveAttribute('data-toggle-variant', off);
  for (const target of [enabled, off]) {
    const actual = await root.evaluate((node, target) => {
      const thumb = node.querySelector('[data-toggle-thumb]')!;
      const position = () => new DOMMatrixReadOnly(getComputedStyle(thumb).transform).m41;
      const start = position();
      node.setAttribute('data-toggle-variant', target);
      void getComputedStyle(thumb).transform;
      const animation = thumb.getAnimations().find(animation => (animation as CSSTransition).transitionProperty === 'transform')!;
      const timing = animation.effect!.getTiming();
      animation.pause();
      animation.currentTime = 100;
      const middle = position();
      node.getAnimations({ subtree: true }).forEach(animation => animation.finish());
      return { start, middle, end: position(), timing };
    }, target);
    expect(actual.timing.duration).toBe(200);
    expect(actual.timing.delay).toBe(0);
    expect(actual.timing.easing).toBe('ease');
    expect(actual.middle).toBeGreaterThan(Math.min(actual.start, actual.end));
    expect(actual.middle).toBeLessThan(Math.max(actual.start, actual.end));
    expect(actual.end).toBe(target === off ? 2 : 16);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await root.evaluate((node, enabled) => {
    node.setAttribute('data-toggle-variant', enabled);
    const thumb = node.querySelector('[data-toggle-thumb]')!;
    const css = getComputedStyle(thumb);
    return { x: new DOMMatrixReadOnly(css.transform).m41, duration: css.transitionDuration, animations: thumb.getAnimations().length };
  }, enabled);
  expect(reduced).toEqual({ x: 16, duration: '0s', animations: 0 });
});

for (const enabled of ['Enable dark', 'Enable danger dark', 'enable light']) test(`Toggle ${enabled}: background fades together with movement`, async ({ page }) => {
  const off = enabled.endsWith('light') ? 'disable light' : 'disable dark';
  await page.goto(`/iframe.html?id=figma-export-toggle--playground&viewMode=story&args=variant:${encodeURIComponent(off)};danger:${enabled === 'Enable danger dark'}`);
  const root = page.locator('[data-toggle-variant]');
  const input = page.getByRole('switch');
  const colors = (variant: string) => {
    const row = tokens.records.find(row => row.variant === variant)!;
    return row.source.children.map(node => {
      const paint = node.properties.fills[0];
      return `rgb(${[paint.color.r, paint.color.g, paint.color.b].map(x => Math.round(x * 255)).join(', ')})`;
    });
  };
  await expect(root).toHaveAttribute('data-toggle-variant', off);
  await expect(root.locator('[data-toggle-track]')).toHaveCSS('transition-duration', '0.2s');
  await expect(root.locator('[data-toggle-thumb]')).toHaveCSS('transition-duration', '0.2s, 0.2s');
  let previous = off;
  for (const target of [enabled, off]) {
    // Stretch the actual CSS transition so assertions cannot miss its active interval.
    await root.locator('[data-toggle-thumb]').evaluate(node => { (node as HTMLElement).style.transitionDuration = '10s'; });
    await root.locator('[data-toggle-track]').evaluate(node => { (node as HTMLElement).style.transitionDuration = '10s'; });
    await input.click();
    await expect(root).toHaveAttribute('data-toggle-variant', target);
    const middle = await root.evaluate(node => {
      const thumb = node.querySelector('[data-toggle-thumb]')!;
      const animations = node.getAnimations({ subtree: true });
      animations.forEach(animation => { animation.pause(); animation.currentTime = 5000; });
      return { track: getComputedStyle(node.querySelector('[data-toggle-track]')!).backgroundColor, thumb: getComputedStyle(thumb).backgroundColor, x: new DOMMatrixReadOnly(getComputedStyle(thumb).transform).m41, timings: animations.map(animation => animation.effect!.getTiming()) };
    });
    const actualColors = [middle.track, middle.thumb];
    for (let i = 0; i < 2; i++) {
      if (colors(previous)[i] === colors(target)[i]) expect(actualColors[i]).toBe(colors(previous)[i]);
      else {
        expect(actualColors[i]).not.toBe(colors(previous)[i]);
        expect(actualColors[i]).not.toBe(colors(target)[i]);
      }
    }
    expect(middle.timings.length).toBe(2);
    for (const timing of middle.timings) expect({ duration: timing.duration, delay: timing.delay, easing: timing.easing }).toEqual({ duration: 10000, delay: 0, easing: 'ease' });
    expect(middle.x).toBeGreaterThan(2);
    expect(middle.x).toBeLessThan(16);
    await root.evaluate(node => node.getAnimations({ subtree: true }).forEach(animation => animation.finish()));
    await expect(root.locator('[data-toggle-track]')).toHaveCSS('background-color', colors(target)[0]);
    await expect(root.locator('[data-toggle-thumb]')).toHaveCSS('background-color', colors(target)[1]);
    await expect(root.locator('[data-toggle-thumb]')).toHaveCSS('transform', `matrix(1, 0, 0, 1, ${target === off ? 2 : 16}, 0)`);
    previous = target;
  }
  await root.locator('[data-toggle-thumb]').evaluate(node => { (node as HTMLElement).style.removeProperty('transition-duration'); });
  await root.locator('[data-toggle-track]').evaluate(node => { (node as HTMLElement).style.removeProperty('transition-duration'); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await input.click();
  await expect(root.locator('[data-toggle-track]')).toHaveCSS('background-color', colors(enabled)[0]);
  await expect(root.locator('[data-toggle-thumb]')).toHaveCSS('background-color', colors(enabled)[1]);
});

test('Toggle reversals return smoothly to the correct source colors', async ({ page }) => {
  await page.goto('/iframe.html?id=figma-export-toggle--playground&viewMode=story');
  const root = page.locator('[data-toggle-variant]');
  const input = page.getByRole('switch');
  const track = root.locator('[data-toggle-track]');
  const thumb = root.locator('[data-toggle-thumb]');
  await expect(input).not.toBeChecked();
  await thumb.evaluate(node => { (node as HTMLElement).style.transitionDuration = '10s'; });
  await track.evaluate(node => { (node as HTMLElement).style.transitionDuration = '10s'; });
  await input.click();
  await expect(input).toBeChecked();
  await root.evaluate(node => node.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 5000; }));
  const middleColor = await track.evaluate(node => getComputedStyle(node).backgroundColor);
  expect(middleColor).not.toBe('rgb(62, 74, 92)');
  expect(middleColor).not.toBe('rgb(115, 183, 67)');
  await input.click();
  await expect(input).not.toBeChecked();
  await root.evaluate(node => node.getAnimations({ subtree: true }).forEach(animation => animation.finish()));
  await expect(thumb).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 2, 0)');
  await expect(track).toHaveCSS('background-color', 'rgb(62, 74, 92)');
  await input.click();
  await expect(input).toBeChecked();
  await root.evaluate(node => node.getAnimations({ subtree: true }).forEach(animation => animation.finish()));
  await expect(track).toHaveCSS('background-color', 'rgb(115, 183, 67)');
});
