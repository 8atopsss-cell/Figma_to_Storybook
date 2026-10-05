import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync('source/figma/resource-tag-export.json', 'utf8'));
const offline = JSON.parse(fs.readFileSync('source/figma/resource-tag-offline-export.json', 'utf8'));
const px = value => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw Error('Missing numeric Figma value');
  return value + 'px';
};
const required = (node, field) => {
  if (!Object.hasOwn(node.properties, field)) throw Error(`Missing ${field}: ${node.id}`);
  return node.properties[field];
};
function color(node, field) {
  const paints = required(node, field).filter(p => p.visible !== false);
  if (!paints.length) return 'transparent';
  if (paints.length !== 1 || paints[0].type !== 'SOLID' || paints[0].blendMode !== 'NORMAL') throw Error('Unsupported paint: ' + node.id);
  const paint = paints[0];
  if (typeof paint.opacity !== 'number') throw Error('Missing paint opacity: ' + node.id);
  return `rgb(${paint.color.r * 255} ${paint.color.g * 255} ${paint.color.b * 255} / ${paint.opacity})`;
}
function audit(node) {
  if (node.childCount !== undefined && node.childCount !== (node.children ?? []).length) throw Error('Incomplete descendants: ' + node.id);
  for (const warning of node.warnings ?? []) {
    if (warning !== 'VECTOR requires SVG or asset export for exact rendering') throw Error(warning + ': ' + node.id);
    if (!Object.keys(raw.assets).some(id => node.id.startsWith('I' + id + ';'))) throw Error('Missing vector asset: ' + node.id);
  }
  if (required(node, 'effects').length || required(node, 'rotation') !== 0 || !['NORMAL', 'PASS_THROUGH'].includes(required(node, 'blendMode'))) throw Error('Unsupported rendering: ' + node.id);
  if (Object.keys(required(node, 'boundVariables')).length) throw Error('Consumer variable resolution required: ' + node.id);
  for (const field of ['fills', 'strokes']) color(node, field);
  for (const child of node.children ?? []) audit(child);
}
function appearance(node, ellipse = false) {
  const p = node.properties;
  const strokes = required(node, 'strokes').filter(p => p.visible !== false);
  if (required(node, 'cornerSmoothing') !== 0 || required(node, 'dashPattern').length) throw Error('Unsupported corners or stroke: ' + node.id);
  if (strokes.length && required(node, 'strokeAlign') !== 'INSIDE' && !(ellipse && p.strokeAlign === 'CENTER')) throw Error('Unsupported stroke alignment: ' + node.id);
  const weight = strokes.length ? required(node, 'strokeWeight') : 0;
  return {
    width: px(node.width), height: px(node.height), background: color(node, 'fills'),
    radius: ellipse ? '50%' : ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'].map(key => px(required(node, key))).join(' '),
    opacity: String(required(node, 'opacity')),
    shadow: strokes.length ? `${p.strokeAlign === 'INSIDE' ? 'inset ' : ''}0 0 0 ${px(p.strokeAlign === 'CENTER' ? weight / 2 : weight)} ${color(node, 'strokes')}` : 'none',
  };
}
const records = [];
const definitions = {};
for (const [theme, set] of Object.entries(raw.sets)) {
  // The component-set editor outline is not part of an exported variant.
  if (set.childCount !== set.children.length || set.warnings.length) throw Error('Incomplete component set');
  definitions[theme] = set.properties.componentPropertyDefinitions;
  const schema = definitions[theme]['Property 1'];
  for (const node of set.children) {
    audit(node);
    const variant = node.properties.variantProperties['Property 1'];
    if (!schema.variantOptions.includes(variant)) throw Error('Variant not in Figma schema');
    // User excluded icon from the exported component; preserve it only in raw Figma data.
    if (variant === 'icon') continue;
    const label = node.children.find(n => n.type === 'TEXT');
    const badge = node.children.find(n => n.properties.componentPropertyReferences?.visible);
    const css = appearance(node);
    css.overflow = required(node, 'clipsContent') ? 'hidden' : 'visible';
    if (label) {
      const p = label.properties;
      if (p.fontName?.family !== 'PT Root UI' || p.fontName.style !== 'Bold' || p.lineHeight?.unit !== 'PIXELS' || p.letterSpacing?.unit !== 'PIXELS' || p.textCase !== 'ORIGINAL' || p.textDecoration !== 'NONE' || label.textSegments?.length !== 1) throw Error('Unsupported typography: ' + label.id);
      if (p.strokes.length) throw Error('Unsupported text strokes');
      Object.assign(css, {
        'label-x': px(label.x), 'label-y': px(label.y), 'label-width': px(label.width), 'label-height': px(label.height),
        color: color(label, 'fills'), 'label-opacity': String(p.opacity), 'font-family': JSON.stringify(p.fontName.family),
        'font-weight': String(label.textSegments[0].fontWeight), 'font-size': px(p.fontSize), 'line-height': px(p.lineHeight.value),
        'letter-spacing': px(p.letterSpacing.value), 'text-align': p.textAlignHorizontal.toLowerCase(),
        'font-features': Object.entries(p.openTypeFeatures).map(([key, value]) => `"${key.toLowerCase()}" ${value ? 1 : 0}`).join(', '),
      });
    }
    if (badge) {
      const dot = badge.children[0];
      if (!dot || dot.type !== 'ELLIPSE' || badge.children.length !== 1) throw Error('Unsupported badge');
      for (const [key, value] of Object.entries(appearance(badge))) css['badge-' + key] = value;
      css['badge-x'] = px(badge.x); css['badge-y'] = px(badge.y);
      for (const [key, value] of Object.entries(appearance(dot, true))) css['dot-' + key] = value;
      css['dot-x'] = px(dot.x); css['dot-y'] = px(dot.y);
    }
    records.push({ theme, variant, nodeId: node.id, setId: set.id, css, labelNodeId: label?.id ?? null,
      statusPropertyId: badge?.properties.componentPropertyReferences.visible ?? null,
      badgeNodeId: badge?.id ?? null, source: node });
  }
  if (schema.variantOptions.filter(v => v !== 'icon').length !== records.filter(r => r.theme === theme).length) throw Error('Incomplete variant coverage');
}
const offlineBadges = {};
for (const [theme, badge] of Object.entries(offline.nodes)) {
  audit(badge);
  const dot = badge.children[0];
  if (badge.properties.variantProperties['Property 1'] !== 'status ofline' || badge.children.length !== 1 || dot.type !== 'ELLIPSE') throw Error('Unsupported offline badge');
  const css = {};
  for (const [key, value] of Object.entries(appearance(badge))) css['badge-' + key] = value;
  for (const [key, value] of Object.entries(appearance(dot, true))) css['dot-' + key] = value;
  css['dot-x'] = px(dot.x); css['dot-y'] = px(dot.y);
  offlineBadges[theme] = { nodeId: badge.id, css, source: badge, origin: offline.source };
}
const variants = Object.fromEntries(Object.entries(definitions).map(([theme, defs]) => [theme, defs['Property 1'].variantOptions.filter(v => v !== 'icon')]));
const tokens = { source: raw.source, definitions, variants, records, variables: raw.variables, offlineBadges,
  exclusions: [{ variant: 'icon', theme: 'dark', nodeId: '11088:25521', reason: 'User requested removal from ResourceTag on 2026-10-05' }],
  geometryPolicy: 'Preserve fixed source dimensions and actual child positions. Auto Layout metadata retained in source; not reconstructed from coordinates.' };
fs.writeFileSync('src/tokens/resource-tags.json', JSON.stringify(tokens, null, 2) + '\n');
const lines = ['/* Generated from source/figma/resource-tag-export.json. Do not edit. */'];
for (const row of records) {
  lines.push(`[data-resource-tag][data-tag-theme=${JSON.stringify(row.theme)}][data-tag-variant=${JSON.stringify(row.variant)}] {`);
  for (const [key, value] of Object.entries(row.css)) lines.push(`  --tag-${key}: ${value};`);
  lines.push('}');
}
for (const [theme, badge] of Object.entries(offlineBadges)) {
  lines.push(`[data-resource-tag][data-tag-theme=${JSON.stringify(theme)}][data-status-state="offline"] {`);
  for (const [key, value] of Object.entries(badge.css)) lines.push(`  --tag-${key}: ${value};`);
  lines.push('}');
}
fs.writeFileSync('src/styles/resource-tag-tokens.css', lines.join('\n') + '\n');
console.log(`ResourceTag: ${records.length} original Figma variants.`);
