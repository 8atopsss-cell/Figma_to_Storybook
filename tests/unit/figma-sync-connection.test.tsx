import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FigmaSyncPanel } from '../../.storybook/figma-sync/manager';
import { credentialKey } from '../../.storybook/figma-sync/credentials';

const code = 'a'.repeat(64);
const result = { files: [], components: [] };
const fetchMock = vi.fn();
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const success = () => ({ ok: true, status: 200, json: async () => result });
it('restores a remembered code automatically, without a new user input', async () => {
  localStorage.setItem(credentialKey, code); fetchMock.mockResolvedValue(success());
  render(<FigmaSyncPanel />);
  expect(await screen.findByText('Подключено. Код сохранён в этом браузере.')).toBeInTheDocument();
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${code}`);
  expect(screen.getByText('Настройки подключения').closest('details')).not.toHaveAttribute('open');
});
it('migrates a valid legacy tab credential after authentication', async () => {
  sessionStorage.setItem(credentialKey, code); fetchMock.mockResolvedValue(success());
  render(<FigmaSyncPanel />);
  await screen.findByText('Подключено. Код сохранён в этом браузере.');
  expect(localStorage.getItem(credentialKey)).toBe(code);
  expect(sessionStorage.getItem(credentialKey)).toBeNull();
});
it('stores the first entry only after successful authentication', async () => {
  fetchMock.mockResolvedValue(success()); render(<FigmaSyncPanel />);
  fireEvent.change(screen.getByLabelText('Код доступа Storybook'), { target: { value: code } });
  expect(localStorage.getItem(credentialKey)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Подключить' }));
  await screen.findByText('Подключено. Код сохранён в этом браузере.');
  expect(localStorage.getItem(credentialKey)).toBe(code);
});
it('shows an invalid code and does not claim that an unloaded component has no baseline', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'SYNC_ACCESS_CODE_REQUIRED' }) });
  render(<FigmaSyncPanel />);
  fireEvent.change(screen.getByLabelText('Код доступа Storybook'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Подключить' }));
  await screen.findByText('Сохранённый код не подходит. Вставьте действующий код доступа.');
  expect(localStorage.getItem(credentialKey)).toBeNull();
  expect(screen.getByText(/Статус ещё не загружен/)).toBeInTheDocument();
});
it('forgets the browser credential only when the user asks', async () => {
  localStorage.setItem(credentialKey, code); fetchMock.mockResolvedValue(success());
  render(<FigmaSyncPanel />); await screen.findByText('Подключено. Код сохранён в этом браузере.');
  fireEvent.click(screen.getByRole('button', { name: 'Забыть подключение в этом браузере' }));
  expect(localStorage.getItem(credentialKey)).toBeNull();
  expect(screen.getByLabelText('Код доступа Storybook')).toHaveValue('');
});
it('reconnects after a temporary bridge outage with the saved credential', async () => {
  vi.useFakeTimers(); localStorage.setItem(credentialKey, code);
  fetchMock.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue(success());
  render(<FigmaSyncPanel />); await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(screen.getByText('Bridge недоступен. Подключение восстановится автоматически.')).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(screen.getByText('Подключено. Код сохранён в этом браузере.')).toBeInTheDocument();
  expect(fetchMock.mock.calls.every(([, options]) => options.headers.Authorization === `Bearer ${code}`)).toBe(true);
});
it('stops automatic retries on a rejected code', async () => {
  vi.useFakeTimers(); localStorage.setItem(credentialKey, code);
  fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'SYNC_ACCESS_CODE_REQUIRED' }) });
  render(<FigmaSyncPanel />); await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
