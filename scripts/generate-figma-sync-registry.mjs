import { readFile, readdir, realpath, writeFile, rename, unlink, mkdir } from 'node:fs/promises';
import { resolve, relative, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import ts from 'typescript';
import { toId } from 'storybook/internal/csf';
import { generateContext } from './figma-sync-context.mjs';

const slug = name => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
const unwrap = node => ts.isSatisfiesExpression(node) || ts.isAsExpression(node) || ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node;
const property = (node, name) => node.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText().replace(/^['"]|['"]$/g, '') === name)?.initializer;
const literal = node => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;

// Read static CSF metadata without executing component code or guessing IDs from names.
export function storyMetadata(text, path) {
  const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const exported = ast.statements.find(ts.isExportAssignment);
  if (!exported) return undefined;
  let meta = unwrap(exported.expression);
  if (ts.isIdentifier(meta)) {
    const variable = ast.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations])
      .find(d => d.name.getText(ast) === meta.text);
    if (!variable?.initializer) return undefined;
    meta = unwrap(variable.initializer);
  }
  if (!ts.isObjectLiteralExpression(meta)) return undefined;
  const title = literal(property(meta, 'title'));
  const component = property(meta, 'component');
  if (!title || !component || !ts.isIdentifier(component)) return undefined;
  const imports = ast.statements.filter(ts.isImportDeclaration).filter(s => ts.isStringLiteral(s.moduleSpecifier));
  const source = imports.find(s => s.importClause?.name?.text === component.text ||
    (s.importClause?.namedBindings && ts.isNamedImports(s.importClause.namedBindings) && s.importClause.namedBindings.elements.some(e => e.name.text === component.text)));
  if (!source || !source.moduleSpecifier.text.startsWith('.')) return undefined;
  const named = source.importClause?.namedBindings;
  const importedName = named && ts.isNamedImports(named) ? named.elements.find(e => e.name.text === component.text) : undefined;
  const componentName = importedName?.propertyName?.text ?? component.text;
  const componentEntryId = literal(property(meta, 'id')) ?? toId(title);
  const exports = ast.statements.filter(s => ts.isVariableStatement(s) && s.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword))
    .flatMap(s => [...s.declarationList.declarations]).filter(d => ts.isIdentifier(d.name)).map(d => d.name.text);
  return { componentId: slug(componentName), displayName: componentName,
    componentEntryId, storyIds: [toId(componentEntryId, 'docs'), ...exports.map(name => toId(componentEntryId, name))],
    importPath: source.moduleSpecifier.text };
}

// Prefer explicit complete roots over duplicate references inside presentation frames.
export function exportRoots(raw) {
  const candidates = [];
  const walk = (value, path) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.id === 'string' && typeof value.type === 'string') {
      if (['COMPONENT_SET', 'COMPONENT'].includes(value.type)) { candidates.push({ node: value, path }); return; }
      if (['FRAME', 'GROUP', 'SECTION'].includes(value.type)) (value.children ?? []).forEach((node, i) => walk(node, [...path, 'children', String(i)]));
      return;
    }
    for (const [key, child] of Object.entries(value)) if (!['assets', 'variables', 'styles'].includes(key)) walk(child, [...path, key]);
  };
  walk(raw, []);
  candidates.sort((a, b) => Number(a.path.includes('children')) - Number(b.path.includes('children')) || a.path.length - b.path.length || a.path.join('.').localeCompare(b.path.join('.')));
  const unique = [...new Map(candidates.toReversed().map(c => [c.node.id, c])).values()];
  const descendants = new Set();
  const visitChildren = node => { for (const child of node.children ?? []) { descendants.add(child.id); visitChildren(child); } };
  unique.forEach(c => visitChildren(c.node));
  const roots = unique.filter(c => !descendants.has(c.node.id)).sort((a, b) => a.path.join('.').localeCompare(b.path.join('.')));
  if (!roots.length) throw new Error('COMPONENT_ROOTS_MISSING');
  const sources = roots.map(({ node, path }) => {
    const leaf = path.at(-1);
    const namedTheme = path.findLast(key => /light|dark/i.test(key)) ?? (/\b(light|dark)\b/i.test(node.name) ? node.name : undefined);
    const theme = namedTheme ? (/dark/i.test(namedTheme) ? 'dark' : 'light') : 'shared';
    const key = /^[A-Za-z][A-Za-z0-9_-]*$/.test(leaf) && !['set', 'tree'].includes(leaf) ? leaf : `${theme}-${node.id.replaceAll(':', '-')}`;
    return { theme, key, componentSetId: node.id, nodeType: node.type, exportPath: path };
  });
  for (const source of sources) if (source.key === source.theme) delete source.key;
  const keys = sources.map(source => source.key ?? source.theme);
  if (new Set(keys).size !== keys.length) throw new Error('DUPLICATE_SOURCE_KEY');
  return sources;
}

async function safePath(project, path) {
  const target = await realpath(resolve(project, path));
  const rel = relative(project, target);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('PATH_OUTSIDE_SYNC_PROJECT');
  return target;
}
async function json(project, path, fallback) {
  try { return JSON.parse(await readFile(await safePath(project, path), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; }
}
async function modulePath(project, storyPath, importPath) {
  const base = relative(project, resolve(dirname(resolve(project, storyPath)), importPath));
  for (const suffix of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) {
    try { return relative(project, await safePath(project, base + suffix)).replaceAll('\\', '/'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  throw new Error('COMPONENT_MODULE_MISSING');
}
async function stories(project, path = 'src') {
  const found = [];
  for (const entry of await readdir(await safePath(project, path), { withFileTypes: true })) {
    const child = `${path}/${entry.name}`;
    if (entry.isDirectory()) found.push(...await stories(project, child));
    else if (entry.name.endsWith('.stories.tsx')) found.push(child);
  }
  return found.sort();
}

export async function buildSyncRegistry(project) {
  project = await realpath(project);
  const config = await json(project, 'source/figma/sync-project.json');
  if (config.schemaVersion !== 1 || !/^[A-Za-z0-9_-]{1,128}$/.test(config.figma?.fileKey ?? '')) throw new Error('INVALID_SYNC_PROJECT_CONFIG');
  const previous = await json(project, 'source/figma/component-links.json', { components: [] });
  const components = [], unconfigured = [];
  for (const path of await stories(project)) {
    const meta = storyMetadata(await readFile(await safePath(project, path), 'utf8'), path);
    if (!meta) continue;
    try {
      const originalExport = config.legacyExports?.[meta.componentId] ?? `source/figma/${meta.componentId}-export.json`;
      const raw = await json(project, originalExport);
      const fileKey = raw.source?.fileKey ?? raw.fileKey ?? config.figma.fileKey;
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(fileKey)) throw new Error('INVALID_FIGMA_FILE_KEY');
      const sourceName = raw.source?.fileName ?? raw.fileName;
      if (!raw.source?.fileKey && !raw.fileKey && sourceName && sourceName !== config.figma.displayName) throw new Error('EXPORT_FILE_KEY_REQUIRED');
      const old = previous.components.find(entry => entry.componentId === meta.componentId);
      components.push({ ...old, componentId: meta.componentId, displayName: meta.displayName,
        modulePath: await modulePath(project, path, meta.importPath),
        storybook: { componentEntryId: meta.componentEntryId, storyIds: meta.storyIds },
        figma: { displayName: sourceName ?? config.figma.displayName, fileKey,
          url: `https://www.figma.com/design/${fileKey}`, sources: exportRoots(raw),
          identitySource: raw.source?.fileKey || raw.fileKey ? 'export' : 'project-config' },
        baselineCandidate: { ...old?.baselineCandidate, rawExport: originalExport, status: 'unverified' } });
    } catch (error) {
      unconfigured.push({ componentEntryId: meta.componentEntryId, displayName: meta.displayName, reason: error.code === 'ENOENT' ? 'SOURCE_EXPORT_MISSING' : error.message });
    }
  }
  for (const field of ['componentId', 'modulePath']) if (new Set(components.map(entry => entry[field])).size !== components.length) throw new Error(`DUPLICATE_${field}`);
  if (new Set(components.map(entry => entry.storybook.componentEntryId)).size !== components.length) throw new Error('DUPLICATE_STORYBOOK_COMPONENT_ID');
  return { schemaVersion: 1, components, unconfigured };
}

async function writeChanged(path, value) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  try { if (await readFile(path, 'utf8') === bytes) return; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const temporary = `${path}.${randomBytes(8).toString('hex')}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  try { await writeFile(temporary, bytes, { flag: 'wx' }); await rename(temporary, path); }
  finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') console.warn('Figma sync temporary file cleanup failed'); }); }
}
let tail = Promise.resolve();
export function generateSyncRegistry(project) {
  const next = tail.then(async () => {
    const registry = await buildSyncRegistry(project);
    const contexts = await generateContext(project, registry);
    await writeChanged(resolve(project, '.storybook/figma-sync/source-context.json'), contexts);
    await writeChanged(resolve(project, 'source/figma/component-links.json'), registry);
    return registry;
  });
  tail = next.catch(() => undefined);
  return next;
}

export function watchSyncSources(project, watcher, onError) {
  let timer;
  const changed = path => {
    const local = relative(project, resolve(path)).replaceAll('\\', '/');
    if (!(local.startsWith('src/') && /\.tsx?$/.test(local)) &&
      !(local.startsWith('source/figma/') && local.endsWith('.json') && local !== 'source/figma/component-links.json')) return;
    clearTimeout(timer);
    timer = setTimeout(() => { void generateSyncRegistry(project).catch(onError); }, 200);
  };
  watcher.add([resolve(project, 'src'), resolve(project, 'source/figma')]);
  for (const event of ['add', 'change', 'unlink']) watcher.on(event, changed);
  return () => {
    clearTimeout(timer);
    for (const event of ['add', 'change', 'unlink']) watcher.off(event, changed);
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const registry = await generateSyncRegistry(process.cwd());
  console.log(`Figma sync: ${registry.components.length} components; ${registry.unconfigured.length} without source.`);
}
