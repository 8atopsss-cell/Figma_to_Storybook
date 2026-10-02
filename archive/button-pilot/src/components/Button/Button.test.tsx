import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button contract', () => {
  it('defaults to a non-submitting button inside a form', async () => {
    const submit = vi.fn((event) => event.preventDefault());
    render(<form onSubmit={submit}><Button>Сохранить</Button></form>);
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(submit).not.toHaveBeenCalled();
  });
  it('supports explicit form submission', async () => {
    const submit = vi.fn((event) => event.preventDefault());
    render(<form onSubmit={submit}><Button type="submit">Сохранить</Button></form>);
    await userEvent.click(screen.getByRole('button'));
    expect(submit).toHaveBeenCalledOnce();
  });
  it('activates by mouse, Enter and Space', async () => {
    const click = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={click}>Продолжить</Button>);
    await user.click(screen.getByRole('button'));
    await user.keyboard('{Enter} ');
    expect(click).toHaveBeenCalledTimes(3);
  });
  it('disabled prevents activation and skips keyboard focus', async () => {
    const click = vi.fn();
    const user = userEvent.setup();
    render(<><Button disabled onClick={click}>Удалить</Button><Button>Отмена</Button></>);
    await user.click(screen.getByRole('button', { name: 'Удалить' }));
    await user.tab();
    expect(screen.getByRole('button', { name: 'Отмена' })).toHaveFocus();
    expect(click).not.toHaveBeenCalled();
  });
  it('decorative icons do not change the accessible name', () => {
    render(<Button startIcon={<svg><title>Plus</title></svg>} endIcon={<span>→</span>}>Добавить</Button>);
    expect(screen.getByRole('button', { name: 'Добавить' })).toHaveAccessibleName('Добавить');
  });
  it('forwards the ref and native aria attributes', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref} aria-pressed="true">Выбрать</Button>);
    expect(ref.current).toBe(screen.getByRole('button', { pressed: true }));
  });
});
