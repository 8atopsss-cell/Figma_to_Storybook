import fs from 'node:fs';
import { raw, rows, excludedVariants, knownKind, assetKey, headerPlayUpdate } from './table-row-source.mjs';

const assets = JSON.parse(fs.readFileSync('source/figma/table-row-assets.json', 'utf8')).assets;
for (const node of Object.values(headerPlayUpdate.nodes)) assets[assetKey(node)] = { svg: headerPlayUpdate.svg, nodeId: node.id };
const styles = JSON.parse(fs.readFileSync('src/tokens/styles.json', 'utf8'));
const colors = new Map(styles.colors.map(style => [style.id, style]));
const toggleAliases = JSON.parse(fs.readFileSync('src/tokens/toggles.json', 'utf8')).variantAliases;
const missingStyleDefinitions = [];
const px = n => {
  if (typeof n !== 'number') throw Error('Missing Figma numeric property');
  return `${n}px`;
};
const required = (node, field) => {
  if (!Object.hasOwn(node.properties, field)) throw Error(`Missing ${field}: ${node.id}`);
  return node.properties[field];
};
const literalPaint = paint => `rgb(${paint.color.r * 255} ${paint.color.g * 255} ${paint.color.b * 255} / ${paint.opacity})`;
function paint(node, field = 'fills') {
  const visible = required(node, field).filter(p => p.visible);
  if (!visible.length) return 'transparent';
  if (visible.length !== 1 || visible[0].type !== 'SOLID') throw Error(`Unsupported paint: ${node.id}`);
  const styleId = node.properties[field === 'fills' ? 'fillStyleId' : 'strokeStyleId'];
  const style = colors.get(styleId);
  if (style) return `var(${style.cssVariable})`;
  if (styleId) missingStyleDefinitions.push({ nodeId: node.id, styleId, field, value: visible[0],
    resolution: 'Style definition unavailable; exact node paint retained, no invented token alias.' });
  return literalPaint(visible[0]);
}
function appearance(node) {
  const p = node.properties;
  if (p.rotation !== 0) throw Error(`Unsupported rotation: ${node.id}`);
  const css = { left: px(node.x), top: px(node.y), width: px(node.width), height: px(node.height), opacity: String(p.opacity) };
  if (!knownKind(node)) {
    const shadows = required(node, 'effects').filter(e => e.visible).map(effect => {
      if (!['DROP_SHADOW', 'INNER_SHADOW'].includes(effect.type)) throw Error(`Unsupported effect: ${node.id}`);
      const color = effect.color;
      return `${effect.type === 'INNER_SHADOW' ? 'inset ' : ''}${px(effect.offset.x)} ${px(effect.offset.y)} ${px(effect.radius)} ${px(effect.spread)} rgb(${color.r * 255} ${color.g * 255} ${color.b * 255} / ${color.a})`;
    });
    css['background-color'] = paint(node);
    if (p.rectangleCornerRadii) css['border-radius'] = [p.topLeftRadius, p.topRightRadius, p.bottomRightRadius, p.bottomLeftRadius].map(px).join(' ');
    if (p.clipsContent !== undefined) css.overflow = p.clipsContent ? 'hidden' : 'visible';
    if (p.strokes.some(s => s.visible)) {
      const width = required(node, 'strokeWeight');
      shadows.push(`${p.strokeAlign === 'INSIDE' ? 'inset ' : ''}0 0 0 ${px(width)} ${paint(node, 'strokes')}`);
    }
    css['box-shadow'] = shadows.length ? shadows.join(', ') : 'none';
  }
  return css;
}
function glyph(node) {
  const key = assetKey(node);
  if (!assets[key]) throw Error(`Missing SVG: ${node.id}`);
  const paints = [];
  const walk = n => {
    if (!n.properties.visible) return;
    for (const field of ['fills', 'strokes']) {
      for (const p of n.properties[field].filter(p => p.visible)) {
        if (p.type !== 'SOLID') throw Error(`Unsupported glyph paint: ${n.id}`);
        paints.push({ value: literalPaint(p), css: paint(n, field) });
      }
    }
    for (const child of n.children ?? []) walk(child);
  };
  walk(node);
  const css = { left: px(node.x), top: px(node.y), width: px(node.width), height: px(node.height) };
  const url = `url("data:image/svg+xml,${encodeURIComponent(assets[key].svg)}")`;
  if (new Set(paints.map(p => p.value)).size === 1) {
    css['mask-image'] = url;
    css['background-color'] = paints[0].css;
  } else css['background-image'] = url;
  return { id: node.id, name: node.name, kind: 'asset', assetKey: key, css, visible: node.properties.visible,
    visibilityProperty: node.properties.componentPropertyReferences?.visible ?? null, children: [] };
}
function compile(node, theme, context = '') {
  const p = node.properties;
  const kind = knownKind(node);
  const visibilityProperty = p.componentPropertyReferences?.visible ?? null;
  if (!p.visible && !visibilityProperty) return null;
  const result = { id: node.id, name: node.name, kind: kind ?? (node.type === 'TEXT' ? 'text' : 'frame'),
    css: appearance(kind || node.type === 'TEXT' || node.type === 'INSTANCE' ? { ...node, properties: { ...p, fills: [], strokes: [] } } : node),
    visible: p.visible, visibilityProperty, children: [] };
  if (node.type === 'TEXT') {
    const segment = node.textSegments?.[0];
    if (node.textSegments?.length !== 1 || !['PIXELS', 'PERCENT', 'AUTO'].includes(p.lineHeight.unit) || !['PIXELS', 'PERCENT'].includes(p.letterSpacing.unit)) throw Error(`Unsupported text: ${node.id}`);
    Object.assign(result.css, { 'font-family': JSON.stringify(p.fontName.family), 'font-size': px(p.fontSize),
      'font-weight': String(segment.fontWeight), 'line-height': p.lineHeight.unit === 'AUTO' ? 'normal' : p.lineHeight.unit === 'PERCENT' ? `${p.lineHeight.value}%` : px(p.lineHeight.value),
      'letter-spacing': p.letterSpacing.unit === 'PERCENT' ? `${p.letterSpacing.value / 100}em` : px(p.letterSpacing.value),
      color: paint(node), 'text-align': p.textAlignHorizontal.toLowerCase(),
      'text-transform': p.textCase === 'UPPER' ? 'uppercase' : p.textCase === 'LOWER' ? 'lowercase' : 'none',
      'font-feature-settings': Object.entries(p.openTypeFeatures).map(([k,v]) => `"${k.toLowerCase()}" ${v ? 1 : 0}`).join(', '),
      'text-decoration': p.textDecoration === 'STRIKETHROUGH' ? 'line-through' : p.textDecoration === 'UNDERLINE' ? 'underline' : 'none',
      overflow: p.textTruncation === 'ENDING' ? 'hidden' : 'visible', 'text-overflow': p.textTruncation === 'ENDING' ? 'ellipsis' : 'clip',
      display: 'flex', 'align-items': p.textAlignVertical === 'CENTER' ? 'center' : p.textAlignVertical === 'BOTTOM' ? 'flex-end' : 'flex-start' });
    // Ellipsis requires a block formatting context; line-height already defines the one-line text height.
    if (p.textTruncation === 'ENDING') { result.css.display = 'block'; delete result.css['align-items']; }
    result.text = node.characters;
    result.dataField = context === 'date' ? (/\d{2}:\d{2}/.test(node.characters) ? 'time' : 'date') :
      node.name === 'ipadress' ? 'ipAddress' : node.name === 'user name' ? (context === 'user control' || node.x < 240 ? 'userName' : 'armName') : null;
    result.textStyleId = p.textStyleId;
  } else if (kind === 'checkbox') {
    const variant = p.variantProperties['Property 1'].toLowerCase();
    result.checked = ['selected', 'select', 'selected disabled', 'disabled selected'].includes(variant);
    result.indeterminate = ['indeterminate', 'variant7'].includes(variant);
    result.disabled = /disable/i.test(variant);
    const label = node.children.find(c => c.type === 'TEXT' && c.properties.visible);
    result.text = label?.characters ?? null;
  } else if (kind === 'toggle') {
    const variant = p.variantProperties['Property 1'];
    result.variant = toggleAliases[variant] ?? variant;
  } else if (kind === 'resource') {
    result.theme = node.name.endsWith('dark') ? 'dark' : 'light';
    result.variant = p.variantProperties['Property 1'];
    result.text = p.componentProperties['Text#1600:4'].value;
    result.dataField = visibilityProperty?.startsWith('more#') ? 'moreText' : visibilityProperty?.startsWith('vd2#') ? 'secondResourceText' : 'resourceText';
    result.status = Object.entries(p.componentProperties).find(([k]) => k.startsWith('status#'))?.[1].value ?? false;
  } else if (kind === 'iconButton') {
    result.variant = p.variantProperties.type;
    result.contrast = p.variantProperties.contrast;
    result.disabled = p.variantProperties.state === 'disable';
    result.children = node.children.filter(c => c.properties.visible && c.type !== 'RECTANGLE').map(glyph);
    result.action = node.x > 1000 ? 'edit' : 'run';
  } else if (kind === 'button') {
    result.variant = p.variantProperties.type;
    result.size = Number.parseInt(p.variantProperties.size, 10);
    result.disabled = p.variantProperties.state === 'disable';
    result.text = node.children.find(c => c.type === 'TEXT' && c.properties.visible)?.characters ?? null;
    result.action = node.children.find(c => c.type === 'TEXT')?.characters ?? 'action';
    result.children = node.children.filter(c => c.type !== 'TEXT' && c.properties.visible).map(glyph);
  } else if (node.type === 'VECTOR' && (node.width === 0 || node.height === 0)) {
    result.kind = 'line';
    result.css['box-shadow'] = 'none';
    result.css['background-color'] = paint(node, 'strokes');
    result.css[node.width === 0 ? 'width' : 'height'] = px(required(node, 'strokeWeight'));
    result.css.transform = node.width === 0 ? 'translateX(-50%)' : 'translateY(-50%)';
  } else if (node.type === 'INSTANCE' || ['VECTOR', 'BOOLEAN_OPERATION'].includes(node.type)) return glyph(node);
  else result.children = (node.children ?? []).map(c => compile(c, theme, node.name)).filter(Boolean);
  return result;
}

// Column boundaries group measured source positions; they are code aliases, not Figma Auto Layout.
const columns = [
  { key: 'selection', label: 'Выбор и статус', x: 0, width: 84 },
  { key: 'user', label: 'Пользователь', x: 84, width: 156 },
  { key: 'warning', label: 'Предупреждение', x: 240, width: 56 },
  { key: 'arm', label: 'АРМ', x: 296, width: 156 },
  { key: 'ip', label: 'IP', x: 452, width: 140 },
  { key: 'date', label: 'Дата', x: 592, width: 144 },
  { key: 'resources', label: 'Ресурсы', x: 736, width: 164 },
  { key: 'action', label: 'Действие', x: 900, width: 50 },
  { key: 'toggle', label: 'Состояние', x: 950, width: 56 },
  { key: 'edit', label: 'Редактирование', x: 1006, width: 46 },
];
const records = rows.map(({ theme, set, node }) => {
  const variant = node.properties.variantProperties['Property 1'];
  const compiled = compile(node, theme);
  const cells = variant === 'action bar' ? [{ key: 'actions', label: 'Действия с выбранными', x: 0, width: node.width, children: compiled.children }] :
    columns.map(column => ({ ...column, children: compiled.children.filter(child => {
      const x = Number.parseFloat(child.css.left);
      return x >= column.x && x < column.x + column.width;
    }).map(child => ({ ...child, css: { ...child.css, left: px(Number.parseFloat(child.css.left) - column.x) } })) }));
  return { theme, variant, nodeId: node.id, setId: set.id, width: node.width, height: node.height,
    css: { background: paint(node), radius: compiled.css['border-radius'], opacity: compiled.css.opacity, shadow: compiled.css['box-shadow'] }, cells,
    sourceWarnings: node.warnings,
    geometryPolicy: 'Fixed measured layer positions; semantic column boundaries are code aliases, not Auto Layout.' };
});
const definitions = Object.fromEntries(raw.sets.map(set => [set.name.endsWith('dark') ? 'dark' : 'light', set.properties.componentPropertyDefinitions]));
const variants = definitions.light['Property 1'].variantOptions.filter(v => !excludedVariants.includes(v));
const tokens = { schemaVersion: 1, source: raw.source, definitions, defaultVariant: definitions.light['Property 1'].defaultValue,
  headerPlayReplacement: { source: headerPlayUpdate.source, replacements: headerPlayUpdate.replacements,
    lightDerivation: headerPlayUpdate.nodes.light.derivation, decision: headerPlayUpdate.decision },
  variants, columns, records, excludedVariants, exclusionReason: 'User excluded expanded and expanded  hover on 2026-10-05.',
  hoverPolicy: { appliesTo: variants.filter(v => !['header', 'action bar'].includes(v)), excludedVariants: ['header', 'action bar'],
    decision: 'User requested row hover in both themes, then excluded header and action bar.',
    sources: Object.fromEntries(['light', 'dark'].map(theme => {
      const hover = records.find(r => r.theme === theme && r.variant === 'hover');
      return [theme, { nodeId: hover.nodeId, background: hover.css.background }];
    })) },
  excludedNodeIds: raw.sets.flatMap(set => set.children.filter(n => excludedVariants.includes(n.properties.variantProperties['Property 1'])).map(n => n.id)),
  missingStyleDefinitions, variables: raw.variables };
fs.writeFileSync('src/tokens/table-rows.json', JSON.stringify(tokens, null, 2) + '\n');
const lines = ['/* Generated from table-row-export.json and table-row-assets.json. Do not edit. */'];
for (const row of records) {
  lines.push(`[data-table-row][data-row-theme="${row.theme}"][data-row-variant="${row.variant}"] {`);
  lines.push(`  --row-background: ${row.css.background};`, `  --row-radius: ${row.css.radius};`, `  --row-opacity: ${row.css.opacity};`, `  --row-shadow: ${row.css.shadow};`, '}');
  const walk = n => { lines.push(`[data-table-layer=${JSON.stringify(n.id)}] {`);
    for (const [key, value] of Object.entries(n.css)) lines.push(`  ${key}: ${value};`);
    lines.push('}'); for (const c of n.children) walk(c); };
  for (const cell of row.cells) for (const node of cell.children) walk(node);
}
for (const theme of ['light', 'dark']) {
  const hover = records.find(r => r.theme === theme && r.variant === 'hover');
  lines.push(`[data-table-row][data-row-theme="${theme}"]:not([data-row-variant="header"]):not([data-row-variant="action bar"]):hover { --row-background: ${hover.css.background}; }`);
}
fs.writeFileSync('src/styles/table-row-tokens.css', lines.join('\n') + '\n');
console.log(`TableRow: ${records.length} Figma variants; expanded states excluded.`);
