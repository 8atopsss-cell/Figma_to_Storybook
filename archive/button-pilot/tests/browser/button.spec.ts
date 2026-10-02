import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const story = (id: string, theme = 'light') => `/iframe.html?id=components-button--${id}&viewMode=story&globals=theme:${theme}`;

test('mouse, keyboard, disabled and visible focus in real browser', async ({ page }) => {
  await page.goto(story('interaction'));
  const action = page.getByRole('button', { name: 'Action', exact: true });
  await action.click();
  await action.press('Enter');
  await action.press('Space');
  await expect(page.locator('output')).toHaveText('3');
  await action.press('Tab');
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(action).toBeFocused();
  await expect(action).toHaveCSS('outline-style', 'solid');
  await expect(action).toHaveCSS('outline-width', '2px');
  await mkdir('artifacts/browser', { recursive: true });
  await page.screenshot({ path: 'artifacts/browser/focus.png' });
});

for (const theme of ['light', 'dark']) {
  test(`hover and active colors follow source in ${theme}`, async ({ page }) => {
    await page.goto(story('primary', theme));
    const button = page.getByRole('button', { name: 'Button', exact: true });
    await expect(button).toHaveCSS('background-color', theme === 'light' ? 'rgb(255, 87, 34)' : 'rgb(255, 112, 67)');
    await button.hover();
    await expect(button).toHaveCSS('background-color', theme === 'light' ? 'rgb(255, 112, 67)' : 'rgb(255, 87, 34)');
    await page.mouse.down();
    await expect(button).toHaveCSS('background-color', 'rgb(230, 74, 25)');
    await page.mouse.up();
  });
  test(`catalogue renders with local font and records a11y in ${theme}`, async ({ page }) => {
    await page.goto(story(`${theme}-catalogue`, theme));
    await expect(page.getByRole('button')).toHaveCount(24);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('700 14px "PT Root UI"'))).toBe(true);
    const audit = await new AxeBuilder({ page }).include('#storybook-root').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await mkdir('artifacts/browser', { recursive: true });
    await writeFile(`artifacts/browser/a11y-${theme}.json`, JSON.stringify(audit, null, 2));
    await page.screenshot({ path: `artifacts/browser/${theme}.png`, fullPage: true });
    // Known design contrast debt remains in the report; every other WCAG violation fails.
    expect(audit.violations.filter(v => v.id !== 'color-contrast')).toEqual([]);
    console.log(`${theme} contrast violations: ${audit.violations.filter(v => v.id === 'color-contrast').flatMap(v => v.nodes).length}`);
  });
}

test('disabled danger large is 40 px', async ({ page }) => {
  await page.goto(story('primary') + '&args=variant:danger;size:40;disabled:true');
  const button = page.getByRole('button', { name: 'Button', exact: true });
  await expect(button).toBeDisabled();
  await expect(button).toHaveCSS('height', '40px');
});

test('long label wraps within narrow container', async ({ page }) => {
  await page.goto(story('long-text'));
  const button = page.getByRole('button');
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(160);
  expect(box!.height).toBeGreaterThan(32);
  expect(await button.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
});

test('public export works in an application outside Storybook', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Действий: 1');
  await expect(page.getByRole('button', { name: 'Удалить', exact: true })).toBeDisabled();
});
