import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Checkbox, CheckboxGroup, CheckboxSkeleton } from '../../src/components/Checkbox/Checkbox';

it('label and Space toggle the native input and expose its ref', async () => {
  const ref = createRef<HTMLInputElement>();
  const change = vi.fn();
  render(<Checkbox ref={ref} onChange={change}>Выбрать</Checkbox>);
  await userEvent.click(screen.getByText('Выбрать'));
  expect(ref.current).toBe(screen.getByRole('checkbox', { name: 'Выбрать' }));
  expect(ref.current).toBeChecked();
  await userEvent.keyboard(' ');
  expect(ref.current).not.toBeChecked();
  expect(change).toHaveBeenCalledTimes(2);
});
it('indeterminate is a DOM state and native activation clears it', async () => {
  render(<Checkbox indeterminate aria-label="Выбрать всё" />);
  const input = screen.getByRole('checkbox') as HTMLInputElement;
  expect(input.indeterminate).toBe(true);
  await userEvent.click(input);
  expect(input.indeterminate).toBe(false);
  expect(input).toBeChecked();
});
it('disabled fieldset blocks activation and excludes values from FormData', async () => {
  const action = vi.fn();
  const { container } = render(<form><Checkbox name="item" value="a" defaultChecked>Первый</Checkbox><CheckboxGroup label="Группа" disabled><Checkbox name="item" value="b" defaultChecked onChange={action}>Второй</Checkbox></CheckboxGroup></form>);
  await userEvent.click(screen.getByText('Второй'));
  expect(action).not.toHaveBeenCalled();
  expect(new FormData(container.querySelector('form')!).getAll('item')).toEqual(['a']);
});
it('skeleton is announced as loading and has no interactive checkbox', () => {
  render(<CheckboxSkeleton />);
  expect(screen.getByRole('status', { name: 'Загрузка' })).toHaveAttribute('aria-busy', 'true');
  expect(screen.queryByRole('checkbox')).toBeNull();
});
