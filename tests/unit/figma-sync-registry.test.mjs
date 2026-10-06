import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { afterEach, expect, it, vi } from 'vitest';
import { buildSyncRegistry, generateSyncRegistry, watchSyncSources } from '../../scripts/generate-figma-sync-registry.mjs';

const folders = [];
afterEach(async () => { for (const folder of folders.splice(0)) await rm(folder, { recursive: true, force: true }); });
async function fixture() {
  const project = await mkdtemp(join(tmpdir(), 'figma-registry-')); folders.push(project);
  await mkdir(join(project, 'source/figma'), { recursive: true });
  await mkdir(join(project, 'src/components'), { recursive: true });
  await writeFile(join(project, 'source/figma/sync-project.json'), JSON.stringify({ schemaVersion: 1, figma: { fileKey: 'original', displayName: 'Source' } }));
  return project;
}
const node = (id, type = 'COMPONENT_SET', children = []) => ({ id, name: id, type, children, childCount: children.length, properties: {} });
async function add(project, name, raw, id) {
  const slug = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  const path = `src/components/${name}`; await mkdir(join(project, path), { recursive: true });
  await writeFile(join(project, path, `${name}.tsx`), `export const ${name} = () => null;`);
  await writeFile(join(project, path, `${name}.stories.tsx`), `import {${name}} from './${name}';
    const meta = {title:'Figma export/${name}', component:${name}${id ? `,id:'${id}'` : ''}} satisfies Meta;
    export default meta; export const Playground = {}; export const Dark = {};`);
  if (raw) await writeFile(join(project, 'source/figma', `${slug}-export.json`), JSON.stringify(raw));
}
it('registers a newly added component from CSF and export without a manual link entry', async () => {
  const project = await fixture();
  await generateSyncRegistry(project);
  await add(project, 'Alert', { source: { fileKey: 'other', fileName: 'Other' }, sets: { light: node('1:1'), dark: node('1:2') } }, 'custom-alert');
  const result = await generateSyncRegistry(project);
  expect(result.components[0]).toMatchObject({ componentId: 'alert', modulePath: 'src/components/Alert/Alert.tsx',
    storybook: { componentEntryId: 'custom-alert', storyIds: ['custom-alert--docs', 'custom-alert--playground', 'custom-alert--dark'] },
    figma: { fileKey: 'other', identitySource: 'export', sources: [
      { theme: 'dark', componentSetId: '1:2', exportPath: ['sets', 'dark'] },
      { theme: 'light', componentSetId: '1:1', exportPath: ['sets', 'light'] }] } });
  expect(await readFile(join(project, 'source/figma/component-links.json'), 'utf8')).not.toMatch(/acceptedSnapshot/);
});
it('covers labelled, icon and group roots of one component and avoids frame duplicates', async () => {
  const project = await fixture();
  const dark = node('dark', 'COMPONENT_SET', [node('variant', 'COMPONENT')]);
  await add(project, 'Checkbox', { source: { fileName: 'Source' }, trees: {
    frameDark: node('frame', 'FRAME', [dark]), dark, iconDark: node('icon'), groupDark: node('group', 'COMPONENT') } });
  const result = await generateSyncRegistry(project);
  expect(result.components[0].figma.sources.map(s => s.componentSetId).sort()).toEqual(['dark', 'group', 'icon']);
  const context = JSON.parse(await readFile(join(project, '.storybook/figma-sync/source-context.json'), 'utf8'));
  expect(context.checkbox.nodes.group).toMatchObject({ theme: 'dark', variantRoot: true });
});
it('supports one shared set and array exports without collapsing roots', async () => {
  const project = await fixture();
  await add(project, 'Switch', { tree: node('shared') });
  await add(project, 'Tag', { sets: [node('light'), node('dark')] });
  const result = await buildSyncRegistry(project);
  expect(result.components.find(e => e.componentId === 'switch').figma.sources).toHaveLength(1);
  expect(new Set(result.components.find(e => e.componentId === 'tag').figma.sources.map(s => s.key))).toHaveProperty('size', 2);
});
it('leaves missing or foreign unidentified exports unconfigured instead of guessing sources', async () => {
  const project = await fixture();
  await add(project, 'Missing');
  await add(project, 'Foreign', { source: { fileName: 'Other' }, tree: node('foreign') });
  const result = await buildSyncRegistry(project);
  expect(result.components).toEqual([]);
  expect(result.unconfigured).toEqual(expect.arrayContaining([
    expect.objectContaining({ displayName: 'Missing', reason: 'SOURCE_EXPORT_MISSING' }),
    expect.objectContaining({ displayName: 'Foreign', reason: 'EXPORT_FILE_KEY_REQUIRED' })]));
});
it('rejects duplicate IDs and prevents reading an export outside the project', async () => {
  const project = await fixture();
  await add(project, 'First', { tree: node('first') }, 'collision');
  await add(project, 'Second', { tree: node('second') }, 'collision');
  await expect(buildSyncRegistry(project)).rejects.toThrow('DUPLICATE_STORYBOOK_COMPONENT_ID');
  const config = { schemaVersion: 1, figma: { fileKey: 'original' }, legacyExports: { first: '../outside.json' } };
  await writeFile(join(project, 'source/figma/sync-project.json'), JSON.stringify(config));
  await writeFile(join(project, '../outside.json'), '{}');
  try { expect((await buildSyncRegistry(project)).unconfigured).toContainEqual(expect.objectContaining({ displayName: 'First', reason: 'PATH_OUTSIDE_SYNC_PROJECT' })); }
  finally { await rm(join(project, '../outside.json')); }
});
it('refreshes the registry while Storybook runs when a new export appears', async () => {
  const project = await fixture(); await add(project, 'Alert'); await generateSyncRegistry(project);
  const watcher = new EventEmitter(); watcher.add = vi.fn();
  const error = vi.fn(); const stop = watchSyncSources(project, watcher, error);
  try {
    await writeFile(join(project, 'source/figma/alert-export.json'), JSON.stringify({ tree: node('alert') }));
    watcher.emit('add', join(project, 'source/figma/alert-export.json'));
    await vi.waitFor(async () => { const result = JSON.parse(await readFile(join(project, 'source/figma/component-links.json'), 'utf8')); expect(result.components[0].componentId).toBe('alert'); });
    expect(error).not.toHaveBeenCalled();
  } finally { stop(); }
});
