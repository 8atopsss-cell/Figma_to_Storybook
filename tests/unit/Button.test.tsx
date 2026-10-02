import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../../src/components/Button/Button';

describe('native Button contract', () => {
  it('exposes a native button with caller name and safe default type', () => {
    render(<Button>Сохранить</Button>);
    expect(screen.getByRole('button', { name: 'Сохранить' })).toHaveAttribute('type', 'button');
  });
  it('does not submit a surrounding form unless requested', async () => {
    const submit = vi.fn((event) => event.preventDefault());
    render(<form onSubmit={submit}><Button>Сохранить</Button></form>);
    await userEvent.click(screen.getByRole('button'));
    expect(submit).not.toHaveBeenCalled();
  });
  it('supports an explicit submit button', async () => {
    const submit = vi.fn((event) => event.preventDefault());
    render(<form onSubmit={submit}><Button type="submit">Отправить</Button></form>);
    await userEvent.click(screen.getByRole('button'));
    expect(submit).toHaveBeenCalledOnce();
  });
  it('prevents disabled mouse activation and skips keyboard navigation', async () => {
    const action = vi.fn();
    render(<><Button disabled onClick={action}>Недоступно</Button><Button>Далее</Button></>);
    await userEvent.click(screen.getByRole('button', { name: 'Недоступно' }));
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Далее' })).toHaveFocus();
    expect(action).not.toHaveBeenCalled();
  });
  it('forwards ref and native attributes', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref} aria-pressed="true" name="action" value="save">Сохранить</Button>);
    expect(ref.current).toBe(screen.getByRole('button'));
    expect(ref.current).toHaveAttribute('aria-pressed', 'true');
    expect(ref.current).toHaveAttribute('value', 'save');
  });
  it('keeps decorative icons out of the accessible name', () => {
    render(<Button startIcon={<svg><title>Плюс</title></svg>} endIcon={<svg><title>Стрелка</title></svg>}>Добавить</Button>);
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeInTheDocument();
  });
});
