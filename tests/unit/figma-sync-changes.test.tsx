import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChangeList } from '../../.storybook/figma-sync/ChangeList';
import { SceneSvg } from '../../.storybook/figma-sync/ScenePreview';
import { describeValue, paintValue, summarizeChanges, type Difference } from '../../.storybook/figma-sync/changes';

afterEach(cleanup);
const orange = [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 112 / 255, b: 67 / 255 } }];
const green = [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 115 / 255, g: 183 / 255, b: 67 / 255 } }];
const changes: Difference[] = [
  { path: '/nodes/1900:44829/properties/fillStyleId', kind: 'changed', before: 'old', after: 'new' },
  { path: '/nodes/1900:44829/properties/fills', kind: 'changed', before: orange, after: green },
  { path: '/styles/new', kind: 'added', after: { name: 'dark theme/text/dark_text_success', paints: green } },
];
const contexts = { '1900:44829': { name: 'type=primary, state=enable, size=32px', type: 'COMPONENT', theme: 'dark',
  variantRoot: true, variant: { type: 'primary', state: 'enable', size: '32px' } } };

describe('readable Figma differences', () => {
  it('explains icon translation in pixels and merges duplicate coordinates regardless of order', () => {
    const raw: Difference[] = [
      { path: '/nodes/icon/x', kind: 'changed', before: 16, after: 20 },
      { path: '/nodes/icon/properties/relativeTransform', kind: 'changed', before: [[1, 0, 16], [0, 1, 8]], after: [[1, 0, 20], [0, 1, 8]] },
    ];
    const result = summarizeChanges(raw, { icon: { name: 'icon wrapper', type: 'INSTANCE' } });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ title: 'Положение иконки', description: 'Иконка смещена на 4 px вправо.',
      before: { text: 'X: 16 px · Y: 8 px' }, after: { text: 'X: 20 px · Y: 8 px' } });
    expect(result[0].paths).toHaveLength(2);
  });

  it('decodes rotation, scale and invalid transforms without calling them array lengths', () => {
    expect(describeValue([[0, -2, 10], [2, 0, -3]], 'relativeTransform').text).toBe('X: 10 px · Y: -3 px · поворот: 90° · масштаб: 2 × 2');
    expect(describeValue([[1, 2]], 'relativeTransform').text).toContain('недоступна');
  });

  it('renders exact saved SVG and positions without injecting SVG markup into the page DOM', () => {
    render(<SceneSvg label="Стало" changedNodeIds={['icon']} scene={{ rootId: 'button', assets: { icon: '<svg><path d="M0 0" /></svg>' },
      nodes: { button: { id: 'button', name: 'Button', type: 'COMPONENT', width: 120, height: 32, children: ['icon'] },
        icon: { id: 'icon', name: 'Icon', type: 'VECTOR', width: 16, height: 16, properties: { relativeTransform: [[1, 0, 20], [0, 1, 8]] } } } }} />);
    expect(screen.getByRole('img', { name: 'Стало' })).toBeInTheDocument();
    expect(document.querySelector('[data-preview-node="icon"]')).toHaveAttribute('transform', 'matrix(1 0 0 1 20 8)');
    expect(document.querySelector('image')).toHaveAttribute('href', expect.stringContaining('data:image/svg+xml'));
    expect(document.querySelector('[data-preview-node="icon"] rect')).toHaveAttribute('stroke-dasharray', '2 2');
  });
  it('groups one background edit into one point without losing its three technical paths', () => {
    const items = summarizeChanges(changes, contexts, { old: 'dark_primary' });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: 'Фон кнопки', location: 'Тёмная тема · primary · обычное · 32 px',
      before: { text: '#ff7043', style: 'dark_primary' },
      after: { text: '#73b743', style: 'dark theme/text/dark_text_success' } });
    expect(items[0].paths.sort()).toEqual(changes.map(change => change.path).sort());
  });

  it('does not collapse changes in separate variants or changes to an existing shared style', () => {
    const more: Difference[] = [...changes, { ...changes[1], path: '/nodes/another/properties/fills' },
      { path: '/styles/new/paints', kind: 'changed', before: orange, after: green }];
    const items = summarizeChanges(more, contexts);
    expect(items).toHaveLength(3);
    expect(items.flatMap(item => item.paths).sort()).toEqual(more.map(change => change.path).sort());
    expect(items[1].location).toContain('контекст отсутствует');
    expect(items[2].title).toContain('dark_text_success');
  });

  it('keeps numeric zero, false, empty and absent values distinct', () => {
    expect(describeValue(0, 'paddingLeft').text).toBe('0 px');
    expect(describeValue(false, 'visible').text).toBe('Нет');
    expect(describeValue(undefined).text).toBe('Не задано');
    expect(paintValue([]).text).toBe('Без заливки');
    expect(paintValue([{ ...green[0], opacity: 0 }]).paints?.[0]).toMatchObject({ text: '#73b743 · 0%', css: 'rgba(115, 183, 67, 0)' });
  });

  it('does not turn gradients, images or hidden paint into a fabricated solid swatch', () => {
    const value = paintValue([{ type: 'GRADIENT_LINEAR' }, { type: 'IMAGE' }, { ...green[0], visible: false }]);
    expect(value.paints).toEqual([{ text: 'Линейный градиент' }, { text: 'Изображение' }, { text: 'Скрытая заливка' }]);
  });

  it('translates geometry, text, layer removal and SVG while preserving fallback technical changes', () => {
    const raw: Difference[] = [
      { path: '/nodes/1900:44829/properties/paddingLeft', kind: 'changed', before: 16, after: 0 },
      { path: '/nodes/text/characters', kind: 'changed', before: 'BUTTON', after: 'Сохранить' },
      { path: '/nodes/removed', kind: 'removed', before: { name: 'Old icon', type: 'INSTANCE' } },
      { path: '/assets/icon', kind: 'changed', before: '<svg/>', after: '<svg>new</svg>' },
      { path: '/variables/consumer/graph', kind: 'added', after: [] },
    ];
    const result = summarizeChanges(raw, contexts);
    expect(result.map(item => item.title)).toEqual(['Отступ слева', 'Текст', 'Удалён слой', 'Геометрия иконки / SVG', 'Переменные и режимы темы']);
    expect(result[0].after.text).toBe('0 px');
    expect(result[2].location).toContain('Old icon');
    expect(result.flatMap(item => item.paths).sort()).toEqual(raw.map(change => change.path).sort());
  });

  it('preserves escaped slashes in style IDs and does not merge unrelated style additions', () => {
    const raw: Difference[] = [
      { path: '/nodes/1900:44829/properties/fillStyleId', kind: 'changed', before: 'old', after: 'S:a/b' },
      { path: '/styles/S:a~1b', kind: 'added', after: { name: 'Assigned' } },
      { path: '/styles/unrelated', kind: 'added', after: { name: 'Other' } },
    ];
    const result = summarizeChanges(raw, contexts);
    expect(result).toHaveLength(2);
    expect(result[0].after.style).toBe('Assigned');
    expect(result[1].title).toBe('Стиль «Other»');
  });

  it('renders before/after colors, variant identity and a Figma layer link; raw paths stay in closed details', () => {
    render(<ChangeList componentId="button" changes={changes} figmaUrl="https://www.figma.com/design/file/Design" />);
    expect(screen.getByText('Фон кнопки')).toBeInTheDocument();
    expect(screen.getByText('Тёмная тема · primary · обычное · 32 px')).toBeInTheDocument();
    expect(screen.getByText('#ff7043')).toBeInTheDocument();
    expect(screen.getByText('#73b743')).toBeInTheDocument();
    expect(screen.getByText('Было')).toBeInTheDocument();
    expect(screen.getByText('Стало')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Слой в Figma ↗' })).toHaveAttribute('href', 'https://www.figma.com/design/file/Design?node-id=1900%3A44829');
    expect(screen.getByText('Технические детали · 3').closest('details')).not.toHaveAttribute('open');
    expect(document.querySelectorAll('.figma-change-swatch')).toHaveLength(2);
  });

  it('labels historical comparisons as preliminary', () => {
    render(<ChangeList componentId="unknown" changes={changes} preliminary />);
    expect(screen.getByRole('heading', { name: /Предварительные изменения/ })).toBeInTheDocument();
    expect(screen.getByText(/исторический экспорт/)).toBeInTheDocument();
  });
});
