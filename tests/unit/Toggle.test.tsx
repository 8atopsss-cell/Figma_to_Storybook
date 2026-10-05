import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Toggle, type ToggleVariant } from '../../src/components/Toggle/Toggle';

it('native switch supports controlled keyboard activation and ref', async () => {
  const ref = createRef<HTMLInputElement>();
  function Demo() {
    const [variant, setVariant] = useState<ToggleVariant>('disable dark');
    return <Toggle ref={ref} variant={variant} name="feature" value="yes" aria-label="Функция" onChange={event => setVariant(event.target.checked ? 'Enable dark' : 'disable dark')} />;
  }
  const { container } = render(<form><Demo /></form>);
  const input = screen.getByRole('switch', { name: 'Функция' });
  expect(ref.current).toBe(input);
  await userEvent.tab();
  await userEvent.keyboard(' ');
  expect(input).toBeChecked();
  expect(new FormData(container.querySelector('form')!).get('feature')).toBe('yes');
  await userEvent.click(input);
  expect(input).not.toBeChecked();
});
it.each(['unactive on dark', 'unactive off light'] as const)('%s is disabled and blocks native changes', async variant => {
  const change = vi.fn();
  const { container } = render(<form><Toggle variant={variant} name="feature" value="yes" aria-label="Функция" onChange={change} /></form>);
  const input = screen.getByRole('switch');
  expect(input).toBeDisabled();
  expect(input).toHaveProperty('checked', variant === 'unactive on dark');
  await userEvent.click(input);
  expect(change).not.toHaveBeenCalled();
  expect(new FormData(container.querySelector('form')!).has('feature')).toBe(false);
});

it('light success appearance survives controlled off/on cycles', async () => {
  function Demo() {
    const [variant, setVariant] = useState<ToggleVariant>('Enable light');
    return <Toggle variant={variant} aria-label="Success" onChange={event => setVariant(event.target.checked ? 'Enable light' : 'disable light')} />;
  }
  render(<Demo />);
  const input = screen.getByRole('switch');
  for (let cycle = 0; cycle < 2; cycle++) {
    expect(input.parentElement).toHaveAttribute('data-toggle-variant', 'Enable light');
    await userEvent.click(input);
    expect(input.parentElement).toHaveAttribute('data-toggle-variant', 'disable light');
    expect(input).not.toBeChecked();
    await userEvent.click(input);
    expect(input).toBeChecked();
  }
  expect(input.parentElement).toHaveAttribute('data-toggle-variant', 'Enable light');
});

it('danger appearance survives controlled off/on cycles', async () => {
  function Demo() {
    const [variant, setVariant] = useState<ToggleVariant>('Enable dark');
    return <Toggle danger variant={variant} aria-label="Danger" onChange={event => setVariant(event.target.checked ? 'Enable dark' : 'disable dark')} />;
  }
  render(<Demo />);
  const input = screen.getByRole('switch');
  for (let cycle = 0; cycle < 3; cycle++) {
    expect(input.parentElement).toHaveAttribute('data-toggle-variant', 'Enable danger dark');
    await userEvent.click(input);
    expect(input).not.toBeChecked();
    expect(input.parentElement).toHaveAttribute('data-toggle-variant', 'disable dark');
    await userEvent.click(input);
    expect(input).toBeChecked();
  }
  expect(input.parentElement).toHaveAttribute('data-toggle-variant', 'Enable danger dark');
});
