import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { compileFigma } from './compile-figma.mjs';

const read = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const hash = (path) => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const current = read('.figma-sync/state.json').components.button;
assert(current.observationComplete && current.observed?.warnings.length === 0, 'Live snapshot must be complete');
const observed = current.observed;
const source = read('source/figma/fresh-export.json');
const tokens = read('src/tokens/buttons.json');
const styles = read('.figma-sync/button-live-styles.json');
const svgs = read('.figma-sync/button-live-svg.json');
const contract = read('source/figma/button-sync-contract.json');
const same = (actual, expected, message) => assert(isDeepStrictEqual(actual, expected), message);
const nodes = observed.data.nodes;
const expand = (id) => {
  const node = nodes[id];
  assert(node, `Missing live node ${id}`);
  return { ...node, children: node.children.map(expand) };
};

const variables = {};
for (const theme of ['light', 'dark']) {
  const root = expand(observed.data.roots[theme]);
  const graph = { variables: [], nodeResolutions: [], warnings: [], pagination: { nextOffset: null }, nodeContext: { resolvedVariableModes: {} } };
  const ids = new Set();
  const visit = (node) => { ids.add(node.id); node.children.forEach(visit); };
  visit(root);
  for (const [id, pages] of Object.entries(observed.data.variables)) {
    if (!ids.has(id)) continue;
    for (const page of pages) {
      assert.equal(page.warnings.length, 0, `${id}: variable warnings`);
      assert.equal(page.pagination.nextOffset, null, `${id}: paginated graph requires merging`);
      for (const variable of page.variables) {
        const existing = graph.variables.find((item) => item.id === variable.id);
        if (existing) same(existing, variable, 'Variable changed during export');
        else graph.variables.push(variable);
      }
      for (const resolution of page.nodeResolutions) {
        assert.equal(resolution.status, 'resolved');
        const existing = graph.nodeResolutions.find((item) => item.variableId === resolution.variableId);
        if (existing) same(existing.resolvedForConsumer, resolution.resolvedForConsumer, 'Theme contains differing consumer resolutions');
        else graph.nodeResolutions.push(resolution);
      }
      const modes = page.nodeContext.resolvedVariableModes;
      for (const [collection, mode] of Object.entries(modes)) {
        assert(!graph.nodeContext.resolvedVariableModes[collection] || graph.nodeContext.resolvedVariableModes[collection] === mode, 'Theme mode mismatch');
        graph.nodeContext.resolvedVariableModes[collection] = mode;
      }
    }
  }
  variables[theme] = graph;
}

const generated = compileFigma({ ...source, light: expand(observed.data.roots.light), dark: expand(observed.data.roots.dark), variables, styles });
const keyed = (records) => Object.fromEntries(records.map((record) => [record.nodeId, record]));
same(keyed(generated.records), keyed(tokens.records), 'Live Figma records differ from implemented tokens');
same(generated.schemas, tokens.schemas, 'Live Figma schema differs from implemented Controls');
same(generated.surfaces, tokens.surfaces, 'Live surface styles differ from implementation');
same(generated.usedVariables, tokens.usedVariables, 'Live bound variables differ from implementation');
assert.equal(generated.records.length, 96);

const iconCode = fs.readFileSync('src/assets/AddIcon.tsx', 'utf8');
const expectedPath = iconCode.match(/\bd="([^"]+)"/)[1];
const paths = (svg) => [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map((match) => match[1].trim().replace(/\s+/g, ' '));
const expected = expectedPath.trim().replace(/\s+/g, ' ');
assert.equal(svgs.length, generated.records.length);
for (const record of generated.records) {
  const asset = svgs.find((item) => item.nodeId === record.nodeId);
  assert(asset && asset.iconWrapperId === record.source.iconWrapperId, `${record.nodeId}: incorrect SVG source`);
  assert.match(asset.svg, /\bviewBox="0 0 16 16"/);
  same(paths(asset.svg), [expected], `${record.nodeId}: icon geometry differs`);
  const definitions = asset.svg.match(/<defs>[\s\S]*?<\/defs>/)?.[0];
  if (definitions) {
    const clip = definitions.match(/^<defs>\s*<clipPath id="([^"]+)">\s*<rect width="16" height="16" fill="white"\/>\s*<\/clipPath>\s*<\/defs>$/);
    assert(clip && asset.svg.includes(`clip-path="url(#${clip[1]})"`), `${record.nodeId}: unverified SVG definitions`);
    // Exact 16x16 clipping frame cannot crop the shared path bounded by 1..15.
  }
  const rendered = definitions ? asset.svg.replace(definitions, '') : asset.svg;
  assert(!/<(?:image|text|circle|rect|polygon|polyline|line|ellipse|use)\b|\btransform=/.test(rendered), `${record.nodeId}: unverified SVG primitives or transform`);
}

const css = fs.readFileSync('src/components/Button/Button.module.css', 'utf8');
assert.match(css, /min-height:\s*var\(--button-height\)/);
assert.match(css, /\.label\s*\{[^}]*white-space:\s*nowrap/);
assert.match(css, /:focus-visible/);
assert.match(css, /300ms cubic-bezier\(0\.656, 0\.003, 0\.355, 1\)/);
assert.match(css, /transition-duration:\s*70ms/);
assert.match(css, /prefers-reduced-motion:\s*reduce/);
assert.equal(contract.excludedVariantProperties[0].type, 'interactive');
assert.equal(tokens.records.filter((record) => record.decisions.some((decision) => decision.includes('39 -> 40'))).length, 1);

console.log(JSON.stringify({
  verified: true, snapshotId: observed.id, revision: current.revision,
  fileKey: '0gdcm1xq6DvKUCR5RVw2wz', sets: observed.data.roots,
  tokenRecords: generated.records.length, svgWrappers: svgs.length,
  liveSchemasMatch: true, liveSurfacesMatch: true, liveVariablesMatch: true,
  contractPath: 'source/figma/button-sync-contract.json',
  implementationFiles: Object.fromEntries([
    'src/components/Button/Button.tsx', 'src/components/Button/Button.module.css', 'src/assets/AddIcon.tsx',
    'src/tokens/buttons.json', 'src/styles/tokens.css', 'src/tokens/api.ts',
    'source/figma/button-sync-contract.json',
  ].map((path) => [path, hash(path)])),
  visualAcceptance: 'pending',
}, null, 2));
