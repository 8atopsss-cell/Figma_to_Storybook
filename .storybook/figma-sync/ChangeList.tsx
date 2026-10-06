import React, { useEffect, useState } from 'react';
import contexts from './source-context.json';
import styles from '../../src/tokens/styles.json';
import { summarizeChanges, type ChangeValue, type Difference, type NodeContext } from './changes';
import './changes.css';
import { ScenePreview, type PreviewPayload } from './ScenePreview';

const sourceContexts = contexts as Record<string, { source: string; nodes: Record<string, NodeContext> }>;
const styleNames = Object.fromEntries(styles.colors.map(style => [style.id, style.name]));
const rawValue = (value: unknown) => value === undefined ? 'Не задано' : JSON.stringify(value, null, 2);
function Value({ value, label }: { value: ChangeValue; label: string }) {
  return <div className="figma-change-value">
    <span className="figma-change-caption">{label}</span>
    {value.paints?.length ? <div className="figma-change-paints">{value.paints.map((paint, index) =>
      <div className="figma-change-paint" key={index}>
        {paint.css && <span className="figma-change-swatch" aria-hidden="true"><span style={{ background: paint.css }} /></span>}
        <span>{paint.text}</span>
      </div>)}</div> : <span className="figma-change-text">{value.text}</span>}
    {value.style && <span className="figma-change-style">Стиль: {value.style}</span>}
  </div>;
}

export function ChangeList({ componentId, changes, figmaUrl, preliminary = false, accessCode, revision, snapshotId }: {
  componentId: string; changes: Difference[]; figmaUrl?: string; preliminary?: boolean; accessCode?: string; revision?: string; snapshotId?: string;
}) {
  const source = sourceContexts[componentId];
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [previewError, setPreviewError] = useState('');
  useEffect(() => {
    setPreview(null); setPreviewError('');
    if (!accessCode || !revision || !snapshotId || preliminary) return;
    const controller = new AbortController();
    void fetch(`http://127.0.0.1:3847/sync/previews?componentId=${encodeURIComponent(componentId)}`, {
      headers: { Authorization: `Bearer ${accessCode}` }, signal: controller.signal,
    }).then(async response => {
      if (response.status === 404) throw new Error('Для превью требуется новая версия запущенного bridge. Перезапустите Codex после обновления.');
      if (!response.ok) throw new Error('Превью сравнения недоступно. Повторите сравнение после подключения источника.');
      const data = await response.json() as PreviewPayload;
      if (data.revision !== revision || data.snapshotId !== snapshotId) throw new Error('Версия сравнения изменилась. Обновите панель.');
      if (!controller.signal.aborted) setPreview(data);
    }).catch(error => { if (!controller.signal.aborted) setPreviewError(error instanceof Error ? error.message : 'Превью недоступно.'); });
    return () => controller.abort();
  }, [accessCode, componentId, revision, snapshotId, preliminary]);
  const currentPreview = preview?.revision === revision && preview?.snapshotId === snapshotId ? preview : null;
  const items = summarizeChanges(changes, { ...source?.nodes, ...currentPreview?.contexts }, styleNames);
  const paths = new Map(changes.map(change => [change.path, change]));
  const nodeLink = (id: string) => {
    if (!figmaUrl) return undefined;
    try { const url = new URL(figmaUrl); url.searchParams.set('node-id', id); return url.toString(); }
    catch { return undefined; }
  };
  return <section className="figma-changes" aria-label="Изменения компонента">
    <h3>{preliminary ? 'Предварительные изменения' : 'Изменения относительно реализации'} <span className="figma-change-count">{items.length}</span></h3>
    <p className="figma-change-intro">Слева — {preliminary ? 'исторический экспорт' : 'реализация'}, справа — новый снимок Figma. Связанные изменения объединены в пункты.</p>
    {previewError && <p role="status">{previewError}</p>}
    {currentPreview?.variants.map(variant => <ScenePreview key={variant.id} preview={variant} />)}
    <ol className="figma-change-list">{items.slice(0, 100).map(item => <li key={item.id} className="figma-change-card">
      <div className="figma-change-heading"><strong>{item.title}</strong>
        {item.nodeId && nodeLink(item.nodeId) && <a href={nodeLink(item.nodeId)} target="_blank" rel="noreferrer">Слой в Figma ↗</a>}
      </div>
      <p className="figma-change-location">{item.location}</p>
      {item.description && <p className="figma-change-description">{item.description}</p>}
      <div className="figma-change-comparison">
        <Value value={item.before} label="Было" />
        <span className="figma-change-arrow" aria-hidden="true">→</span>
        <Value value={item.after} label="Стало" />
      </div>
      <details className="figma-change-details"><summary>Технические детали · {item.paths.length}</summary>
        {source && <p>Названия слоёв и вариантов — из последнего экспорта. Значения «Было / Стало» — из сравнения.</p>}
        {item.paths.map(path => { const change = paths.get(path)!;
          return <div key={path}><code>{path}</code><div className="figma-change-raw">
            <pre>{rawValue(change.before)}</pre><pre>{rawValue(change.after)}</pre>
          </div></div>;
        })}
      </details>
    </li>)}</ol>
    {items.length > 100 && <p>Показаны первые 100 пунктов. Полный список доступен ниже.</p>}
    <details className="figma-change-details"><summary>Все технические записи · {changes.length}</summary>
      {changes.map(change => <div key={change.path}><code>{change.path}</code><div className="figma-change-raw">
        <pre>{rawValue(change.before)}</pre><pre>{rawValue(change.after)}</pre>
      </div></div>)}
    </details>
  </section>;
}
