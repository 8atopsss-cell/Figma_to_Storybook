import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Compact identities from the source export; values always come from the live diff.
// Run `node scripts/figma-sync-context.mjs` after replacing an export to refresh the index.
export function indexSource(roots) {
  const nodes = {};
  const visit = (node, theme, variant) => {
    const next = node.type === 'COMPONENT' ? node.properties?.variantProperties ?? {} : variant;
    nodes[node.id] = { name: node.name, type: node.type, theme, variant: next,
      ...(node.type === 'COMPONENT' ? { variantRoot: true } : {}) };
    for (const child of node.children ?? []) visit(child, theme, next);
  };
  for (const [theme, root] of Object.entries(roots)) visit(root, theme, {});
  return nodes;
}

export async function generateContext(project) {
  const registry = JSON.parse(await readFile(resolve(project, 'source/figma/component-links.json'), 'utf8'));
  const components = {};
  for (const entry of registry.components) {
    const raw = JSON.parse(await readFile(resolve(project, entry.baselineCandidate.rawExport), 'utf8'));
    const roots = Object.fromEntries(entry.figma.sources.map(source => [source.theme, raw[source.theme]]));
    components[entry.componentId] = { source: entry.baselineCandidate.rawExport, nodes: indexSource(roots) };
  }
  return components;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(await generateContext(process.cwd()), null, 2));
}
