import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { IconButton } from '../../src/components/IconButton/IconButton';
import tokens from '../../src/tokens/icon-buttons.json';
import styles from '../../src/tokens/styles.json';

it('icon button has an accessible name, native keyboard activation and ref', async () => {
  const click = vi.fn(), ref = createRef<HTMLButtonElement>();
  render(<IconButton ref={ref} aria-label="Удалить" onClick={click} />);
  const button = screen.getByRole('button', { name: 'Удалить' });
  expect(ref.current).toBe(button);
  expect(button).toHaveAttribute('type', 'button');
  expect(button.querySelector('[data-mini-glyph]')).toHaveAttribute('aria-hidden', 'true');
  await userEvent.tab(); await userEvent.keyboard('{Enter}'); await userEvent.keyboard(' ');
  expect(click).toHaveBeenCalledTimes(2);
});
it('disabled blocks clicks and custom icon stays decorative', async () => {
  const click = vi.fn();
  render(<IconButton disabled aria-label="Добавить" icon={<svg><title>Icon</title></svg>} onClick={click} />);
  const button = screen.getByRole('button', { name: 'Добавить' });
  await userEvent.click(button);
  expect(click).not.toHaveBeenCalled();
  expect(button.querySelector('svg')?.parentElement).toHaveAttribute('aria-hidden', 'true');
});
it('complete state/size grid preserves 33 original variants and uses only explicit style aliases', () => {
  expect(tokens.records).toHaveLength(64);
  expect(tokens.records.filter(r => r.origin === 'figma')).toHaveLength(33);
  expect(new Set(tokens.records.map(r => [r.theme,r.size,r.variant,r.contrast,r.state].join('/'))).size).toBe(64);
  const known = new Set(styles.colors.map(s => `var(${s.cssVariable})`));
  for (const row of tokens.records) for (const field of ['background', 'color', 'outlineColor'] as const) {
    expect(row.css[field] === 'transparent' || known.has(row.css[field])).toBe(true);
  }
  for (const a of tokens.aliases) expect(styles.colors.find(s => s.id === a.styleId)?.cssVariable).toBe(a.cssVariable);
});
it('primary 24 retains its source glyph and background rectangle through all added states', () => {
  const rows = tokens.records.filter(r => r.theme === 'light' && r.variant === 'primary' && r.size === 24);
  expect(new Set(rows.map(r => r.css.mask)).size).toBe(1);
  expect(rows.map(r => r.css.bw)).toEqual([24,24,24,24]);
});
