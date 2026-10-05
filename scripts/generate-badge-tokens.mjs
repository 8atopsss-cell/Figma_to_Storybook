import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync('source/figma/badge-export.json', 'utf8'));
const px = n => {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw Error('Missing numeric Badge value');
  return n + 'px';
};
const required = (node, key) => {
  if (!Object.hasOwn(node.properties, key)) throw Error(`Missing ${key}: ${node.id}`);
  return node.properties[key];
};
function paint(node, field) {
  const paints = required(node, field).filter(p => p.visible !== false);
  if (!paints.length) return 'transparent';
  if (paints.length !== 1 || paints[0].type !== 'SOLID' || paints[0].blendMode !== 'NORMAL' || typeof paints[0].opacity !== 'number') throw Error('Unsupported paint: ' + node.id);
  const p = paints[0];
  if (Object.keys(p.boundVariables ?? {}).length) throw Error('Bound paint requires consumer resolution');
  return `rgb(${p.color.r * 255} ${p.color.g * 255} ${p.color.b * 255} / ${p.opacity})`;
}
function audit(node) {
  if (node.warnings.length || (node.childCount !== undefined && node.childCount !== (node.children ?? []).length)) throw Error('Incomplete Badge node: ' + node.id);
  if (required(node, 'effects').length || required(node, 'rotation') !== 0 || !['NORMAL', 'PASS_THROUGH'].includes(required(node, 'blendMode')) || required(node, 'dashPattern').length) throw Error('Unsupported Badge effects');
  if (Object.keys(required(node, 'boundVariables')).length) throw Error('Bound node requires consumer resolution');
  if (node.type !== 'TEXT' && required(node, 'cornerSmoothing') !== 0) throw Error('Unsupported corner smoothing');
  required(node, 'visible'); required(node, 'opacity');
  paint(node, 'fills'); paint(node, 'strokes');
  for (const child of node.children ?? []) audit(child);
}
const records = [];
const definitions = {};
for (const [theme, set] of Object.entries(raw.sets)) {
  if (set.warnings.length || set.children.length !== set.childCount) throw Error('Incomplete Badge set');
  definitions[theme] = set.properties.componentPropertyDefinitions;
  for (const node of set.children) {
    audit(node);
    const p = node.properties;
    const variant = p.variantProperties['Property 1'];
    if (!definitions[theme]['Property 1'].variantOptions.includes(variant)) throw Error('Unknown Badge variant');
    const text = node.children.find(c => c.type === 'TEXT');
    const circles = node.children.filter(c => c.type === 'ELLIPSE');
    if (node.children.length !== circles.length + (text ? 1 : 0)) throw Error('Unsupported Badge child');
    const strokes = p.strokes.filter(s => s.visible !== false);
    if (strokes.length && p.strokeAlign !== 'OUTSIDE') throw Error('Unsupported frame stroke alignment');
    const css = { width: px(node.width), height: px(node.height), background: paint(node, 'fills'),
      radius: ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'].map(k => px(required(node, k))).join(' '),
      opacity: String(p.opacity), overflow: p.clipsContent ? 'hidden' : 'visible',
      shadow: strokes.length ? `0 0 0 ${px(required(node, 'strokeWeight'))} ${paint(node, 'strokes')}` : 'none' };
    if (text) {
      const t = text.properties;
      if (p.layoutMode !== 'HORIZONTAL' || p.layoutSizingHorizontal !== 'HUG' || t.fontName?.family !== 'PT Root UI' || t.fontName.style !== 'Bold' || t.lineHeight?.unit !== 'PIXELS' || t.letterSpacing?.unit !== 'PIXELS' || t.textCase !== 'ORIGINAL' || t.textDecoration !== 'NONE' || text.textSegments?.length !== 1 || t.strokes.length) throw Error('Unsupported count layout or font');
      Object.assign(css, { 'padding-top': px(p.paddingTop), 'padding-right': px(p.paddingRight), 'padding-bottom': px(p.paddingBottom), 'padding-left': px(p.paddingLeft),
        'min-width': p.minWidth === null ? 'auto' : px(p.minWidth), 'text-source-width': px(text.width), color: paint(text, 'fills'), 'text-opacity': String(t.opacity),
        'font-family': JSON.stringify(t.fontName.family), 'font-size': px(t.fontSize), 'font-weight': String(text.textSegments[0].fontWeight),
        'line-height': px(t.lineHeight.value), 'letter-spacing': px(t.letterSpacing.value), 'text-align': t.textAlignHorizontal.toLowerCase(),
        'font-features': Object.entries(t.openTypeFeatures).map(([k, v]) => `"${k.toLowerCase()}" ${v ? 1 : 0}`).join(', ') });
    }
    const shapes = circles.map(circle => {
      const c = circle.properties;
      const visibleStroke = c.strokes.some(s => s.visible !== false);
      if (visibleStroke && c.strokeAlign !== 'CENTER') throw Error('Unsupported ellipse stroke alignment');
      return { nodeId: circle.id, x: circle.x, y: circle.y, width: circle.width, height: circle.height,
        fill: paint(circle, 'fills'), stroke: paint(circle, 'strokes'), strokeWidth: visibleStroke ? c.strokeWeight : 0,
        opacity: c.opacity, visible: c.visible };
    });
    records.push({ theme, variant, nodeId: node.id, setId: set.id, css, shapes, textNodeId: text?.id ?? null,
      defaultText: text?.characters ?? null, textPropertyId: text?.properties.componentPropertyReferences.characters ?? null, source: node });
  }
  if (definitions[theme]['Property 1'].variantOptions.length !== records.filter(r => r.theme === theme).length) throw Error('Incomplete Badge variants');
}
fs.writeFileSync('src/tokens/badges.json', JSON.stringify({ source: raw.source, definitions, records, variables: raw.variables }, null, 2) + '\n');
const lines = ['/* Generated from source/figma/badge-export.json. Do not edit. */'];
for (const r of records) {
  lines.push(`[data-badge][data-badge-theme=${JSON.stringify(r.theme)}][data-badge-variant=${JSON.stringify(r.variant)}] {`);
  for (const [k, v] of Object.entries(r.css)) lines.push(`  --badge-${k}: ${v};`);
  lines.push('}');
}
fs.writeFileSync('src/styles/badge-tokens.css', lines.join('\n') + '\n');
console.log(`Badge: ${records.length} original Figma variants.`);
