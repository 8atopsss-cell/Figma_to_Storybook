import React, { useEffect, useState, useSyncExternalStore } from 'react';
import type { HashEntry } from 'storybook/manager-api';
import links from '../../source/figma/component-links.json';
import { ChangeList } from './ChangeList';
import type { Difference } from './changes';
import { credentialKey, readCredential, rememberCredential, forgetCredential } from './credentials';
import type { SelectedComponent } from './selection';

type Component = { componentId: string; displayName: string; status: string; bound: boolean;
  storybook?: { componentEntryId: string; storyIds: string[] };
  stale?: boolean;
  revision?: string; snapshotId?: string; comparedAt?: string; warnings: string[];
  differences: Difference[]; candidateDifferences?: Difference[];
  figma: { fileKey: string; displayName: string; url?: string } };
type State = { files: { id: string; name: string; active: boolean; fileKey?: string }[]; components: Component[]; loaded?: boolean; protocolVersion?: number };
const labels: Record<string, string> = {
  'no-baseline': 'Нет подтверждённой базы', incomplete: 'Неполное сравнение',
  'needs-transfer': 'Требуется перенос', ready: 'Готово к визуальной приёмке',
  accepted: 'Принято', 'implementation-changed': 'Реализация изменена после переноса',
};
const errors: Record<string, string> = {
  FILE_CONFIRMATION_REQUIRED: 'Подтверди открытый файл Figma перед сравнением.',
  FIGMA_NOT_CONNECTED: 'Подключи файл Figma.', SYNC_ACCESS_CODE_REQUIRED: 'Нужен код доступа Storybook.',
  FILE_IDENTITY_MISMATCH: 'Открыт другой файл Figma.', STALE_ACCEPTANCE_REQUEST: 'Версия изменилась. Сравни заново.',
  SOURCE_OR_IMPLEMENTATION_CHANGED: 'Figma или код изменились. Приёмка не назначена.',
};
let state: State = { files: [], components: [] };
const listeners = new Set<() => void>();
const publish = (next: State) => { state = { ...next, loaded: next.loaded ?? true }; for (const listener of listeners) listener(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const useStateStore = () => useSyncExternalStore(subscribe, () => state);
const endpoint = 'http://127.0.0.1:3847';
class AccessCodeError extends Error {}

async function request(path: string, code: string, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(`${endpoint}/sync/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${code}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) throw new AccessCodeError('Сохранённый код не подходит. Вставьте действующий код доступа.');
    throw new Error(errors[data.error] ?? data.error ?? `HTTP ${response.status}`);
  }
  return data;
}

export function FigmaSyncLabel({ item }: { item: HashEntry }) {
  const current = useStateStore();
  const entry = item.type === 'component' && !item.refId
    ? current.loaded ? current.components.find(entry => entry.storybook?.componentEntryId === item.id)
      : links.components.find((entry) => entry.storybook.componentEntryId === item.id) : undefined;
  const record = entry && current.components.find((component) => component.componentId === entry.componentId);
  const status = record?.status;
  const label = record?.stale ? 'Источник не подтверждён' : status ? labels[status] : 'сравнение не настроено';
  return <span>{item.name}{entry && (status !== 'accepted' || record?.stale) && <span
    aria-label={`Figma: ${label}`}
    title={`Figma: ${label}`}
    style={{ marginLeft: 6, color: status === 'needs-transfer' ? '#a63b00' : '#767676', fontSize: 11 }}
  >{status === 'needs-transfer' ? '●' : status === 'ready' ? '◷' : '?'}</span>}</span>;
}

export function FigmaSyncPanel({ selected }: { selected?: SelectedComponent }) {
  const current = useStateStore();
  const [code, setCode] = useState(readCredential);
  const [draftCode, setDraftCode] = useState(readCredential);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [connected, setConnected] = useState(false);
  const [remembered, setRemembered] = useState(false);
  const [error, setError] = useState<{ message: string; componentEntryId?: string }>();
  const [connectionError, setConnectionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyComponentEntryId, setBusyComponentEntryId] = useState<string>();
  const refresh = async () => publish(await request('components', code));
  const run = async (action: () => Promise<void>, componentEntryId?: string) => {
    setBusy(true); setBusyComponentEntryId(componentEntryId); setError(undefined);
    try { await action(); }
    catch (failure) {
      if (failure instanceof AccessCodeError) setConnected(false);
      setError({ componentEntryId, message: failure instanceof TypeError ? 'Нет соединения с локальным bridge. Проверь запуск новой версии и код доступа.'
        : failure instanceof Error ? failure.message : 'Ошибка сравнения' });
      try { if (!(failure instanceof AccessCodeError)) await refresh(); } catch {
        publish({ ...state, components: state.components.map((component) => ({ ...component, stale: true, bound: false })) });
      }
    } finally { setBusy(false); }
  };
  useEffect(() => {
    if (!code) return;
    let active = true;
    let inFlight = false;
    let retry = 1000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const connect = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      let delay = 10_000;
      let invalidCode = false;
      try {
        const next = await request('components', code, undefined, controller.signal);
        if (!active) return;
        publish(next); setConnected(true); setRemembered(rememberCredential(code)); setConnectionError(''); retry = 1000;
      } catch (failure) {
        if (!active) return;
        setConnected(false);
        invalidCode = failure instanceof AccessCodeError;
        setConnectionError(failure instanceof AccessCodeError ? failure.message : 'Bridge недоступен. Подключение восстановится автоматически.');
        publish({ ...state, components: state.components.map(component => ({ ...component, stale: true, bound: false })) });
        delay = retry; retry = Math.min(retry * 2, 15_000);
      } finally { inFlight = false; }
      if (active && !invalidCode) timer = setTimeout(() => { void connect(); }, delay);
    };
    const reconnect = () => { clearTimeout(timer); void connect(); };
    void connect();
    window.addEventListener('focus', reconnect);
    return () => {
      active = false; clearTimeout(timer); controller.abort();
      window.removeEventListener('focus', reconnect);
    };
  }, [code, connectionAttempt]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== credentialKey && event.key !== null) return;
      if (event.newValue === null) forgetCredential();
      const next = readCredential(); setCode(next); setDraftCode(next); setConnected(false);
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  const configured = current.loaded ? current.components.find(entry => entry.storybook?.componentEntryId === selected?.entryId)
    : links.components.find(entry => entry.storybook.componentEntryId === selected?.entryId);
  const records = configured ? [current.components.find(entry => entry.componentId === configured.componentId) ?? {
    ...configured, status: 'unknown', bound: false, warnings: [], differences: [],
  } as Component] : [];
  const visibleError = error && (!error.componentEntryId || error.componentEntryId === selected?.entryId) ? error.message : '';
  const canCompare = connected && (current.protocolVersion ?? 1) >= 2;
  const form = <form onSubmit={(event) => {
    event.preventDefault();
    const candidate = draftCode.trim();
    void run(async () => {
      const next = await request('components', candidate);
      publish(next); setRemembered(rememberCredential(candidate)); setConnected(true);
      setCode(candidate); setDraftCode(candidate); setConnectionAttempt(attempt => attempt + 1);
    });
  }}>
    <label>Код доступа Storybook <input type="password" autoComplete="off" value={draftCode}
      onChange={(event) => setDraftCode(event.target.value)} disabled={busy} /></label>{' '}
    <button type="submit" disabled={busy || !draftCode.trim()}>Подключить</button>
    <p>Введите один раз. Подключение сохранится в этом браузере.</p>
  </form>;
  return <section style={{ padding: 16, fontSize: 13 }} aria-label="Связь с Figma">
    {connected ? <><p role="status">Подключено. {remembered ? 'Код сохранён в этом браузере.' : 'Браузер запретил сохранение; подключение действует в этой вкладке.'}</p>
      <details><summary>Настройки подключения</summary>{form}
        <button disabled={busy} onClick={() => {
          forgetCredential(); setCode(''); setDraftCode(''); setConnected(false); setError(undefined); setConnectionError(''); publish({ files: [], components: [], loaded: false });
        }}>Забыть подключение в этом браузере</button>
      </details></> : form}
    {busy && (!busyComponentEntryId || busyComponentEntryId === selected?.entryId) && <p role="status">{busyComponentEntryId ? 'Сравнение…' : 'Подключение…'}</p>}
    {connectionError && <p role="alert">{connectionError}</p>}
    {connected && !canCompare && <p role="status">Для сравнения новых компонентов перезапустите Codex: установлена новая версия bridge.</p>}
    {visibleError && <p role="alert">{visibleError}</p>}
    {!configured && <p>{selected ? `Для ${selected.name} сравнение с Figma ещё не настроено.` : 'Выберите компонент в списке Storybook.'}</p>}
    <ul>{records.map((entry) => {
      const changes = entry.differences.length ? entry.differences : entry.candidateDifferences ?? [];
      const file = current.files.find((candidate) => candidate.active);
      return <li key={entry.componentId} style={{ marginBottom: 20 }}>
        <strong>{entry.displayName}</strong> — {entry.status === 'unknown' ? 'Статус ещё не загружен' : labels[entry.status] ?? entry.status}.
        {entry.stale && <p>Источник не подтверждён для текущего подключения. Последний результат может быть устаревшим.</p>}
        <p>Источник: {entry.figma.url ? <a href={entry.figma.url} target="_blank" rel="noreferrer">{entry.figma.displayName}</a> : entry.figma.displayName}.</p>
        {!entry.bound && file && <button disabled={busy || !canCompare} onClick={() => void run(async () => {
          await request('bind', code, { fileKey: entry.figma.fileKey, connectionId: file.id, componentId: entry.componentId }); await refresh();
        }, selected?.entryId)}>Подтвердить: открыт {file.name} по ссылке выше</button>}{' '}
        <button disabled={busy || !canCompare || !entry.bound} onClick={() => void run(async () => {
          publish(await request('compare', code, { componentId: entry.componentId }));
        }, selected?.entryId)}>Сравнить с Figma</button>{' '}
        {entry.status === 'ready' && <button disabled={busy || !canCompare || !!entry.stale || !entry.bound} onClick={() => void run(async () => {
          publish(await request('accept', code, { componentId: entry.componentId, snapshotId: entry.snapshotId, revision: entry.revision }));
        }, selected?.entryId)}>OK — принимаю визуально</button>}
        {entry.comparedAt && <p>Последнее сравнение: {new Date(entry.comparedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК.</p>}
        {entry.candidateDifferences && <p>Предварительная разница с историческим экспортом. База реализации пока не подтверждена.</p>}
        {entry.warnings.length > 0 && <details><summary>Ограничения данных: {entry.warnings.length}</summary>
          <ul>{entry.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
        {changes.length > 0 && <ChangeList componentId={entry.componentId} changes={changes}
          figmaUrl={entry.figma.url} preliminary={!entry.differences.length && !!entry.candidateDifferences}
          accessCode={connected ? code : undefined} revision={entry.revision} snapshotId={entry.snapshotId} />}
      </li>;
    })}</ul>
  </section>;
}
