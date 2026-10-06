import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { HashEntry } from 'storybook/manager-api';
import { ScopedFigmaSyncPanel } from '../../.storybook/figma-sync/ScopedPanel';
import { resolveSelectedComponent } from '../../.storybook/figma-sync/selection';
import { credentialKey } from '../../.storybook/figma-sync/credentials';

const manager = vi.hoisted(() => ({ storyId: 'button--playground', refId: undefined as string | undefined, index: {} as Record<string, HashEntry> }));
vi.mock('storybook/manager-api', () => ({ useStorybookState: () => manager, useStorybookApi: () => ({ resolveStory: (id: string) => manager.index[id] }) }));
vi.mock('../../.storybook/figma-sync/ChangeList', () => ({ ChangeList: ({ componentId }: { componentId: string }) => <p data-testid={`${componentId}-changes`}>{componentId} changes</p> }));

const fetchMock = vi.fn();
const record = (componentId: string, displayName: string, entryId: string) => ({ componentId, displayName,
  storybook: { componentEntryId: entryId, storyIds: [`${entryId}--playground`] },
  status: 'needs-transfer', bound: true, warnings: [], differences: [{ path: '/nodes/root/properties/width', kind: 'changed', before: 20, after: 24 }],
  figma: { fileKey: 'original', displayName: 'Source', url: 'https://www.figma.com/design/original' } });
const response = () => ({ ok: true, status: 200, json: async () => ({ protocolVersion: 2, files: [], components: [record('button', 'Button', 'figma-export-button'), record('checkbox', 'Checkbox', 'figma-export-checkbox'), record('alert', 'Alert', 'new-alert')] }) });
const entry = (type: HashEntry['type'], id: string, name: string, parent?: string) => ({ type, id, name, parent, depth: 1, tags: [], children: [] } as HashEntry);
beforeEach(() => {
  manager.storyId = 'button--playground'; manager.refId = undefined;
  manager.index = {
    'figma-export-button': entry('component', 'figma-export-button', 'Button'),
    'button--playground': entry('story', 'button--playground', 'Playground', 'figma-export-button'),
    'button--dark': entry('story', 'button--dark', 'Dark', 'figma-export-button'),
    'button--docs': entry('docs', 'button--docs', 'Docs', 'figma-export-button'),
    'figma-export-checkbox': entry('component', 'figma-export-checkbox', 'Checkbox'),
    'checkbox--playground': entry('story', 'checkbox--playground', 'Playground', 'figma-export-checkbox'),
    'new-alert': entry('component', 'new-alert', 'Alert'),
    'alert--playground': entry('story', 'alert--playground', 'Playground', 'new-alert'),
    'button-group': entry('component', 'button-group', 'ButtonGroup'),
    'button-group--playground': entry('story', 'button-group--playground', 'Playground', 'button-group'),
  };
  localStorage.setItem(credentialKey, 'a'.repeat(64));
  vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); fetchMock.mockResolvedValue(response());
});
it('replaces Button changes with Checkbox changes immediately on navigation', async () => {
  const view = render(<ScopedFigmaSyncPanel />);
  await screen.findByTestId('button-changes');
  expect(screen.queryByTestId('checkbox-changes')).not.toBeInTheDocument();
  manager.storyId = 'checkbox--playground'; view.rerender(<ScopedFigmaSyncPanel />);
  expect(screen.getByTestId('checkbox-changes')).toBeInTheDocument();
  expect(screen.queryByTestId('button-changes')).not.toBeInTheDocument();
});
it('resolves catalogues and Docs to the same component using the index parent', () => {
  for (const story of ['button--playground', 'button--dark', 'button--docs']) {
    expect(resolveSelectedComponent(story, undefined, id => manager.index[id])).toEqual({ entryId: 'figma-export-button', name: 'Button' });
  }
});
it('shows a component discovered by the server without requiring a new bundled registry', async () => {
  manager.storyId = 'alert--playground'; render(<ScopedFigmaSyncPanel />);
  await screen.findByTestId('alert-changes');
  expect(screen.queryByTestId('button-changes')).not.toBeInTheDocument();
});
it('does not match an unconfigured component by a similar name or ID prefix', async () => {
  manager.storyId = 'button-group--playground'; render(<ScopedFigmaSyncPanel />);
  await screen.findByText('Подключено. Код сохранён в этом браузере.');
  expect(screen.getByText('Для ButtonGroup сравнение с Figma ещё не настроено.')).toBeInTheDocument();
  expect(screen.queryByTestId('button-changes')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Сравнить с Figma' })).not.toBeInTheDocument();
});
it('does not expose local changes in a composed remote Storybook with the same IDs', async () => {
  manager.refId = 'remote'; render(<ScopedFigmaSyncPanel />);
  await screen.findByText('Подключено. Код сохранён в этом браузере.');
  expect(screen.queryByTestId('button-changes')).not.toBeInTheDocument();
  expect(resolveSelectedComponent('button--playground', undefined, id => ({ ...manager.index[id], refId: 'remote' }))).toBeUndefined();
});
it('keeps a delayed Button comparison error out of the Checkbox panel', async () => {
  let rejectCompare!: (error: Error) => void;
  fetchMock.mockImplementation((url: string) => url.endsWith('/compare')
    ? new Promise((_resolve, reject) => { rejectCompare = reject; }) : Promise.resolve(response()));
  const view = render(<ScopedFigmaSyncPanel />); await screen.findByTestId('button-changes');
  fireEvent.click(screen.getByRole('button', { name: 'Сравнить с Figma' }));
  manager.storyId = 'checkbox--playground'; view.rerender(<ScopedFigmaSyncPanel />);
  await act(async () => { rejectCompare(new Error('Button comparison failed')); });
  expect(screen.queryByText('Button comparison failed')).not.toBeInTheDocument();
  expect(screen.getByTestId('checkbox-changes')).toBeInTheDocument();
});
it('handles an unloaded or cyclic index without falling back to all components', () => {
  expect(resolveSelectedComponent(undefined, undefined, id => manager.index[id])).toBeUndefined();
  expect(resolveSelectedComponent('missing', undefined, id => manager.index[id])).toBeUndefined();
  const cyclic = entry('group', 'cycle', 'Cycle', 'cycle');
  expect(resolveSelectedComponent('cycle', undefined, () => cyclic)).toBeUndefined();
});
it('disables mutations and explains the required restart when an older bridge is still running', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ files: [], components: [record('button', 'Button', 'figma-export-button')] }) });
  render(<ScopedFigmaSyncPanel />); await screen.findByTestId('button-changes');
  expect(screen.getByText(/Для сравнения новых компонентов перезапустите Codex/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Сравнить с Figma' })).toBeDisabled();
});
