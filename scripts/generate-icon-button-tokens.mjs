import fs from 'node:fs';
import { createHash } from 'node:crypto';

const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const raw = read('source/figma/icon-button-export.json');
const styles = read('src/tokens/styles.json').colors;
const buttons = read('source/figma/fresh-export.json');
const byId = new Map(styles.map(s => [s.id, s]));
const aliases = [];
function paint(node, field) {
  const p = node.properties;
  const paints = p[field].filter(p => p.visible !== false);
  if (!paints.length) return 'transparent';
  if (paints.length !== 1 || paints[0].type !== 'SOLID') throw Error('Unsupported paint: ' + node.id);
  const id = p[field === 'fills' ? 'fillStyleId' : 'strokeStyleId'];
  const token = byId.get(id);
  if (!token) throw Error('Paint has no design-system token: ' + node.id + ' ' + id);
  aliases.push({ nodeId: node.id, field, styleId: id, cssVariable: token.cssVariable, rawPaint: paints[0], value: token.value });
  return `var(${token.cssVariable})`;
}
function paintedLeaf(node) {
  if (node.properties.fills?.length || node.properties.strokes?.length) return node;
  for (const child of node.children ?? []) { const leaf = paintedLeaf(child); if (leaf) return leaf; }
}
const assetDir = 'src/assets/icon-buttons';
fs.mkdirSync(assetDir, { recursive: true });
const assets = raw.assets.map(a => {
  const filename = a.nodeId.replaceAll(':', '-') + '.svg';
  fs.writeFileSync(assetDir + '/' + filename, a.svg);
  return { ...a, svg: undefined, filename, sha256: createHash('sha256').update(a.svg).digest('hex') };
});
const sourceRows = [];
for (const [theme, set] of Object.entries(raw.sets)) for (const node of set.children) {
  const v = node.properties.variantProperties;
  const bg = node.children.find(n => n.type === 'RECTANGLE') ?? node;
  const glyph = node.children.find(n => n.type !== 'RECTANGLE');
  const leaf = paintedLeaf(glyph);
  const asset = assets.find(a => a.variantNodeId === node.id);
  sourceRows.push({ theme, variant: v.type, contrast: v.contrast, state: v.state, size: node.width,
    nodeId: node.id, origin: 'figma', source: { setId: set.id, nodeId: node.id, glyphNodeId: glyph.id },
    css: { background: paint(bg, 'fills'), color: paint(leaf, leaf.properties.fills.length ? 'fills' : 'strokes'), outlineColor: paint(bg, 'strokes'), outlineWidth: bg.properties.strokes.length ? bg.properties.strokeWeight : 0,
      bx: bg === node ? 0 : bg.x, by: bg === node ? 0 : bg.y, bw: bg.width, bh: bg.height, radius: bg.properties.cornerRadius,
      gx: glyph.x, gy: glyph.y, gw: glyph.width, gh: glyph.height, opacity: node.properties.opacity,
      mask: `url('../assets/icon-buttons/${asset.filename}')` } });
}
const records = [];
for (const theme of ['light', 'dark']) for (const size of [18, 24]) for (const [variant, contrast] of [['primary', 'high'], ['tertiary', 'high'], ['ghost', 'high'], ['ghost', 'low']]) for (const state of ['enabled', 'hover', 'active', 'disable']) {
  const exact = sourceRows.find(r => r.theme === theme && r.size === size && r.variant === variant && r.contrast === contrast && r.state === state);
  if (exact) { records.push(exact); continue; }
  const base = sourceRows.find(r => r.theme === theme && r.size === 18 && r.variant === variant && r.contrast === contrast && r.state === state)
    ?? sourceRows.find(r => r.theme === theme && r.size === 18 && r.variant === variant && r.contrast === contrast && r.state === 'enabled');
  const css = { ...base.css };
  const decisions = [];
  if (base.state !== state) {
    const button = buttons[theme].children.find(n => { const v = n.properties.variantProperties; return v.type === variant && v.state === state && parseInt(v.size) === 32; });
    if (!button) throw Error('Missing Button analogue');
    const label = button.children.find(n => n.type === 'TEXT');
    css.background = paint(button, 'fills'); css.color = paint(label, 'fills'); css.outlineColor = paint(button, 'strokes');
    css.outlineWidth = button.properties.strokes.length ? base.css.outlineWidth : 0;
    decisions.push({ rule: 'Missing state: Button palette via explicit style IDs; mini geometry retained', buttonNodeId: button.id });
  }
  if (size !== base.size) {
    const target = sourceRows.find(r => r.theme === theme && r.size === size && r.variant === variant && r.contrast === contrast && r.state === 'enabled');
    if (target) {
      for (const k of ['bx', 'by', 'bw', 'bh', 'gx', 'gy', 'gw', 'gh', 'radius', 'mask']) css[k] = target.css[k];
      decisions.push({ rule: 'Missing state at existing size: retain enabled geometry and glyph; palette from matching 18 px state', geometryNodeId: target.nodeId });
    } else {
      for (const k of ['bx', 'by', 'bw', 'bh', 'gx', 'gy', 'gw', 'gh']) css[k] *= size / base.size;
      decisions.push({ rule: 'Missing size: proportionally scale the 18 px mini geometry to 24 px; radius and stroke unchanged', baseNodeId: base.nodeId });
    }
  }
  records.push({ theme, size, variant, contrast, state, origin: 'derived', nodeId: null, source: base.source, decisions, css });
}
const tokens = { source: raw.source, schemas: Object.fromEntries(Object.entries(raw.sets).map(([theme, set]) => [theme, set.properties.componentPropertyDefinitions])), aliases, assets, records };
fs.writeFileSync('src/tokens/icon-buttons.json', JSON.stringify(tokens, null, 2) + '\n');
const lines = ['/* Generated from Figma and explicit design-system style IDs. */'];
const suffix = { enabled: '', hover: ':hover:not(:disabled):not([data-preview-state])', active: ':active:not(:disabled):not([data-preview-state])', disable: ':disabled' };
for (const state of ['enabled', 'hover', 'active', 'disable']) for (const r of records.filter(r => r.state === state)) {
  const selector = `[data-theme="${r.theme}"] [data-icon-button][data-variant="${r.variant}"][data-contrast="${r.contrast}"][data-size="${r.size}"]`;
  for (const tail of [suffix[state], `[data-preview-state="${state}"]`]) {
    lines.push(selector + tail + ' {');
    for (const [k, v] of Object.entries(r.css)) lines.push(`  --mini-${k}: ${typeof v === 'number' && k !== 'opacity' ? v + 'px' : v};`);
    lines.push('}');
  }
}
fs.writeFileSync('src/styles/icon-button-tokens.css', lines.join('\n') + '\n');
console.log(`IconButton: ${sourceRows.length} Figma variants + ${records.length - sourceRows.length} explicit additions; ${assets.length} original SVGs; all paints use style IDs.`);
