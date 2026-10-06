import React from 'react';
import { affine, paintValue, type NodeContext } from './changes';
import '../../src/styles/fonts.css';

export type SceneNode = { id: string; name: string; type: string; width?: number; height?: number;
  x?: number; y?: number; characters?: string; children?: string[]; properties?: Record<string, unknown>;
  textSegments?: Record<string, unknown>[] };
export type Scene = { rootId: string; nodes: Record<string, SceneNode>; assets: Record<string, string> };
export type VariantPreview = { id: string; context: NodeContext; changedNodeIds: string[]; before: Scene | null; after: Scene | null };
export type PreviewPayload = { revision: string; snapshotId: string; contexts: Record<string, NodeContext>; variants: VariantPreview[] };
const number = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const record = (value: unknown) => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const color = (value: unknown) => paintValue(value).paints?.find(paint => paint.css)?.css ?? 'none';

function shape(node: SceneNode) {
  const p = node.properties ?? {}, w = number(node.width), h = number(node.height);
  const radius = (name: string) => Math.max(0, Math.min(w / 2, h / 2, number(p[name], number(p.cornerRadius))));
  const tl = radius('topLeftRadius'), tr = radius('topRightRadius'), br = radius('bottomRightRadius'), bl = radius('bottomLeftRadius');
  return `M${tl} 0 H${w - tr} Q${w} 0 ${w} ${tr} V${h - br} Q${w} ${h} ${w - br} ${h} H${bl} Q0 ${h} 0 ${h - bl} V${tl} Q0 0 ${tl} 0 Z`;
}

export function SceneSvg({ scene, changedNodeIds, label }: { scene: Scene; changedNodeIds: string[]; label: string }) {
  const root = scene.nodes[scene.rootId], width = number(root?.width), height = number(root?.height);
  if (!root || width <= 0 || height <= 0) return <p>Геометрия превью недоступна.</p>;
  const render = (id: string, depth = 0): React.ReactNode => {
    const node = scene.nodes[id], props = node?.properties ?? {};
    if (!node || depth > 32 || props.visible === false) return null;
    const matrix = id === scene.rootId ? undefined : affine(props.relativeTransform);
    const transform = matrix ? `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.x} ${matrix.y})`
      : id !== scene.rootId ? `translate(${number(node.x)} ${number(node.y)})` : undefined;
    const w = number(node.width), h = number(node.height), asset = scene.assets[id];
    const font = record(props.fontName), spacing = record(props.letterSpacing), line = record(props.lineHeight);
    const text = props.textCase === 'UPPER' ? node.characters?.toUpperCase() : props.textCase === 'LOWER' ? node.characters?.toLowerCase() : node.characters;
    return <g key={id} data-preview-node={id} transform={transform} opacity={number(props.opacity, 1)}>
      {asset ? <image href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset)}`} width={w} height={h} />
        : node.type === 'TEXT' ? <foreignObject width={w} height={h}>
          <div style={{ color: color(props.fills), fontFamily: typeof font.family === 'string' ? font.family : 'sans-serif',
            fontWeight: number(node.textSegments?.[0]?.fontWeight, 400), fontSize: number(props.fontSize, 14),
            lineHeight: line.unit === 'PIXELS' ? `${number(line.value)}px` : 'normal',
            letterSpacing: spacing.unit === 'PIXELS' ? number(spacing.value) : `${number(spacing.value) / 100}em`,
            whiteSpace: 'pre', margin: 0, padding: 0, textAlign: props.textAlignHorizontal === 'CENTER' ? 'center' : 'left' }}>{text}</div>
        </foreignObject> : <path d={shape(node)} fill={color(props.fills)} stroke={color(props.strokes)} strokeWidth={number(props.strokeWeight)} />}
      {!asset && node.type !== 'TEXT' && (node.children ?? []).map(child => render(child, depth + 1))}
      {changedNodeIds.includes(id) && <rect x={-1} y={-1} width={w + 2} height={h + 2} rx={2}
        fill="none" stroke="#a688ff" strokeWidth={1} strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />}
    </g>;
  };
  const left = number(root.properties?.paddingLeft), right = number(root.properties?.paddingRight);
  return <svg role="img" aria-label={label} className="figma-scene-svg" viewBox={`-8 -8 ${width + 16} ${height + 35}`}
    width={(width + 16) * 2} height={(height + 35) * 2}>
    {render(scene.rootId)}
    {[{ from: 0, to: left, amount: left }, { from: width - right, to: width, amount: right }].filter(m => m.amount > 0).map((measure, index) =>
      <g key={index} className="figma-scene-ruler">
        <path d={`M${measure.from} ${height + 5} V${height + 11} M${measure.from} ${height + 8} H${measure.to} M${measure.to} ${height + 5} V${height + 11}`} fill="none" stroke="currentColor" strokeWidth={.6} />
        <text x={(measure.from + measure.to) / 2} y={height + 22} textAnchor="middle" fontSize={7} fill="currentColor">{measure.amount} px</text>
      </g>)}
  </svg>;
}

export function ScenePreview({ preview }: { preview: VariantPreview }) {
  const theme = preview.context.theme, variant = preview.context.variant ?? {};
  const states: Record<string, string> = { enable: 'обычное', hover: 'наведение', active: 'нажатие', disable: 'недоступно' };
  return <section className="figma-scene" aria-label={`Превью варианта ${preview.id}`}>
    <h4>Изменённый вариант · {theme === 'dark' ? 'тёмная тема' : theme === 'light' ? 'светлая тема' : theme} · {variant.type ?? preview.context.name} · {states[variant.state] ?? variant.state} · {variant.size?.replace(/px$/, ' px')}</h4>
    <div className="figma-scene-pair">{(['before', 'after'] as const).map(side => {
      const scene = preview[side], label = side === 'before' ? 'Было' : 'Стало';
      const root = scene?.nodes[scene.rootId];
      return <div key={side} className="figma-scene-side"><strong>{label}</strong>
        <div className={`figma-scene-stage ${theme === 'dark' ? 'figma-scene-dark' : 'figma-scene-light'}`}>
          {scene ? <SceneSvg scene={scene} changedNodeIds={preview.changedNodeIds} label={`${label}: ${preview.context.name}`} /> : <span>{side === 'before' ? 'Варианта не было' : 'Вариант удалён'}</span>}
        </div>
        {root && <span className="figma-scene-dimensions">{root.width} × {root.height} px</span>}
      </div>;
    })}</div>
    <p className="figma-scene-note">Масштаб 2×. Пунктир выделяет изменённые области; линейки показывают отступы. Схематичное превью по снимкам сравнения.</p>
  </section>;
}
