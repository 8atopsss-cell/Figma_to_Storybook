import fs from 'node:fs';
import { createHash } from 'node:crypto';

const sourcePath = 'source/figma/menu-button-export.json';
const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const styles = JSON.parse(fs.readFileSync('src/tokens/styles.json', 'utf8'));
const badges = JSON.parse(fs.readFileSync('src/tokens/badges.json', 'utf8'));
const aliases = [];
const required = (node, field) => {
  if (!Object.hasOwn(node.properties, field)) throw Error(`Missing ${field}: ${node.id}`);
  return node.properties[field];
};
const px = value => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw Error('Missing numeric MenuButton value');
  return `${value}px`;
};
function paint(node, field) {
  const paints = required(node, field).filter(p => p.visible !== false);
  if (!paints.length) return 'transparent';
  if (paints.length !== 1 || paints[0].type !== 'SOLID' || paints[0].blendMode !== 'NORMAL' || typeof paints[0].opacity !== 'number' || Object.keys(paints[0].boundVariables ?? {}).length) throw Error(`Unsupported paint: ${node.id}`);
  const styleId = required(node, field === 'fills' ? 'fillStyleId' : 'strokeStyleId');
  if (styleId) {
    const token = styles.colors.find(s => s.id === styleId);
    const fresh = raw.styles.paints.find(s => s.id === styleId);
    if (!token || !fresh || JSON.stringify(token.raw.paints) !== JSON.stringify(fresh.paints)) throw Error(`Missing/stale style token: ${styleId}`);
    if (JSON.stringify(paints) !== JSON.stringify(fresh.paints.filter(p => p.visible !== false))) throw Error(`Node paint differs from bound style: ${node.id}`);
    aliases.push({ nodeId: node.id, field, styleId, cssVariable: token.cssVariable });
    return `var(${token.cssVariable})`;
  }
  const p = paints[0];
  return `rgb(${p.color.r * 255} ${p.color.g * 255} ${p.color.b * 255} / ${p.opacity})`;
}
function audit(node) {
  if (node.childCount !== undefined && node.childCount !== (node.children ?? []).length) throw Error(`Incomplete node: ${node.id}`);
  for (const warning of node.warnings ?? []) {
    if (warning === 'VECTOR requires SVG or asset export for exact rendering' && raw.assets.some(a => node.id.startsWith(`I${a.iconNodeId};`))) continue;
    // In both active frames all strokes are explicitly invisible. Mixed weight is preserved,
    // but has no rendered contribution; never substitute a guessed strokeWeight in raw data.
    if (warning === 'strokeWeight has mixed values' && required(node, 'strokes').every(s => s.visible === false)) continue;
    throw Error(`${warning}: ${node.id}`);
  }
  if (required(node, 'effects').length || required(node, 'rotation') !== 0 || !['NORMAL', 'PASS_THROUGH'].includes(required(node, 'blendMode')) || required(node, 'dashPattern').length || Object.keys(required(node, 'boundVariables')).length) throw Error(`Unsupported rendering: ${node.id}`);
  for (const field of ['visible', 'opacity']) required(node, field);
  for (const field of ['fills', 'strokes']) paint(node, field);
  for (const child of node.children ?? []) audit(child);
}
const records = [];
const definitions = raw.set.properties.componentPropertyDefinitions;
if (raw.set.warnings.length || raw.set.childCount !== raw.set.children.length) throw Error('Incomplete MenuButton set');
fs.mkdirSync('src/assets/menu-buttons', { recursive: true });
for (const node of raw.set.children) {
  audit(node);
  const p = node.properties;
  const { state, theme } = p.variantProperties;
  if (!definitions.state.variantOptions.includes(state) || !definitions.theme.variantOptions.includes(theme)) throw Error('Unknown MenuButton variant');
  const content = node.children.find(c => c.name === 'Content');
  const label = content?.children.find(c => c.type === 'TEXT');
  const icon = content?.children.find(c => c.type === 'INSTANCE');
  const badge = node.children.find(c => c.properties.componentPropertyReferences?.visible === 'badge#7049:16');
  if (!content || !label || !icon || content.children.length !== 2 || node.children.length !== (badge ? 2 : 1)) throw Error('Unsupported MenuButton structure');
  const t = label.properties;
  const vector = icon.children[0];
  const asset = raw.assets.find(a => a.variantNodeId === node.id && a.iconNodeId === icon.id);
  if (!asset || icon.children.length !== 1 || vector.type !== 'VECTOR' || !asset.svg.includes(`viewBox="0 0 ${icon.width} ${icon.height}"`)) throw Error('Missing exact icon wrapper');
  if (p.layoutMode !== 'HORIZONTAL' || p.layoutSizingHorizontal !== 'HUG' || content.properties.layoutMode !== 'HORIZONTAL' || t.fontName.family !== 'PT Root UI' || !['Regular', 'Medium'].includes(t.fontName.style) || t.lineHeight.unit !== 'PIXELS' || !['PIXELS', 'PERCENT'].includes(t.letterSpacing.unit) || label.textSegments.length !== 1 || t.textCase !== 'ORIGINAL' || t.textDecoration !== 'NONE' || t.strokes.some(s => s.visible !== false)) throw Error('Unsupported layout or typography');
  if (p.strokes.some(s => s.visible !== false) || p.cornerSmoothing !== 0) throw Error('Unsupported frame border');
  const assetFile = `${node.id.replaceAll(':', '-')}.svg`;
  fs.writeFileSync(`src/assets/menu-buttons/${assetFile}`, asset.svg);
  const css = {
    'background': paint(node, 'fills'), 'radius': ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'].map(k => px(required(node, k))).join(' '),
    'opacity': String(p.opacity), 'overflow': p.clipsContent ? 'hidden' : 'visible',
    'padding-top': px(p.paddingTop), 'padding-right': px(p.paddingRight), 'padding-bottom': px(p.paddingBottom), 'padding-left': px(p.paddingLeft),
    'gap': px(content.properties.itemSpacing), 'content-opacity': String(content.properties.opacity),
    'icon-width': px(icon.width), 'icon-height': px(icon.height), 'icon-color': paint(vector, 'fills'), 'icon-opacity': String(icon.properties.opacity * vector.properties.opacity),
    'icon-mask': `url("../assets/menu-buttons/${assetFile}")`, 'label-source-width': px(label.width),
    'color': paint(label, 'fills'), 'label-opacity': String(t.opacity), 'font-family': JSON.stringify(t.fontName.family),
    'font-size': px(t.fontSize), 'font-weight': String(label.textSegments[0].fontWeight), 'line-height': px(t.lineHeight.value),
    'letter-spacing': t.letterSpacing.unit === 'PERCENT' ? `${t.letterSpacing.value / 100}em` : px(t.letterSpacing.value),
    'font-features': Object.entries(t.openTypeFeatures).map(([k, v]) => `"${k.toLowerCase()}" ${v ? 1 : 0}`).join(', '),
  };
  // User requests the existing Badge in both themes. Preserve original MenuButton badge
  // paints in source; render Badge's own theme tokens without overriding its internals.
  const placement = badge ?? raw.set.children.find(n => n.properties.variantProperties.theme === 'dark' && n.properties.variantProperties.state === state)?.children.find(c => c.properties.componentPropertyReferences?.visible === 'badge#7049:16');
  const composedBadge = badges.records.find(r => r.theme === theme && r.variant === 'medium');
  if (!placement || !composedBadge) throw Error('Missing Badge component/placement source');
  Object.assign(css, { 'badge-x': px(placement.x), 'badge-y': px(placement.y), 'badge-opacity': String(placement.properties.opacity) });
  records.push({ nodeId: node.id, sourceName: node.name, state, theme, css, defaultText: label.characters,
    labelNodeId: label.id, labelPropertyId: t.componentPropertyReferences.visible, iconNodeId: icon.id,
    assetFile, assetSha256: createHash('sha256').update(asset.svg).digest('hex'),
    badge: { nodeId: badge?.id ?? null, propertyId: placement.properties.componentPropertyReferences.visible,
      variant: 'medium', componentSourceNodeId: composedBadge.nodeId, positionSourceNodeId: placement.id,
      positionOrigin: badge ? 'figma' : 'derived', appearanceSource: 'src/tokens/badges.json' },
    source: node });
}
if (new Set(records.map(r => `${r.theme}/${r.state}`)).size !== records.length || records.length !== definitions.theme.variantOptions.length * definitions.state.variantOptions.length) throw Error('Missing/duplicate MenuButton variants');
fs.writeFileSync('src/tokens/menu-buttons.json', JSON.stringify({ source: raw.source, definitions, records, aliases, variables: raw.variables, decisions: raw.decisions }, null, 2) + '\n');
const lines = ['/* Generated from source/figma/menu-button-export.json. Do not edit. */'];
// Explicit previews win over native interaction so Light/Dark catalogues remain stable.
for (const r of records.filter(r => r.state === 'default')) writeRule(`[data-menu-button][data-menu-theme="${r.theme}"]`, r);
for (const state of ['hover', 'active']) for (const r of records.filter(r => r.state === state)) writeRule(`[data-menu-button][data-menu-theme="${r.theme}"]:not([data-preview-state]):not([data-menu-selected="true"]):${state}:not(:disabled)`, r);
for (const r of records.filter(r => r.state === 'active')) writeRule(`[data-menu-button][data-menu-theme="${r.theme}"][data-menu-selected="true"]`, r);
for (const r of records) writeRule(`[data-menu-button][data-menu-theme="${r.theme}"][data-preview-state="${r.state}"]`, r);
// Native disabled uses the exact source disable variant and wins over previews/selection.
for (const r of records.filter(r => r.state === 'disable')) writeRule(`[data-menu-button][data-menu-theme="${r.theme}"]:disabled`, r);
function writeRule(selector, r) {
  lines.push(`${selector} {`);
  for (const [k, v] of Object.entries(r.css)) lines.push(`  --menu-${k}: ${v};`);
  lines.push('}');
}
fs.writeFileSync('src/styles/menu-button-tokens.css', lines.join('\n') + '\n');
console.log(`MenuButton: ${records.length} original variants; ${raw.assets.length} original SVG wrappers.`);
