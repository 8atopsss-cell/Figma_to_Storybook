import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { MenuButton } from '../../src/components/MenuButton/MenuButton';

it('supports keyboard activation and ref without accidentally submitting a form', async () => {
  const ref = createRef<HTMLButtonElement>();
  const click = vi.fn();
  const submit = vi.fn(event => event.preventDefault());
  render(<form onSubmit={submit}><MenuButton ref={ref} text="Контейнеры" onClick={click} /></form>);
  const button = screen.getByRole('button', { name: 'Контейнеры' });
  expect(ref.current).toBe(button);
  await userEvent.tab();
  await userEvent.keyboard('{Enter}');
  expect(click).toHaveBeenCalledOnce();
  expect(submit).not.toHaveBeenCalled();
});

it('retains an accessible name with the label hidden and respects native disabled', async () => {
  const click = vi.fn();
  render(<MenuButton showLabel={false} text="Контейнеры" disabled onClick={click} />);
  const button = screen.getByRole('button', { name: 'Контейнеры' });
  expect(screen.queryByText('Контейнеры')).not.toBeInTheDocument();
  await userEvent.click(button);
  expect(click).not.toHaveBeenCalled();
});
