import fs from 'node:fs';
import { createHash } from 'node:crypto';

const sourcePath = 'source/figma/sidebar-export.json';
const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
// Retain the first full export; the fresh layout snapshot supplies current trees/shells.
const layoutUpdatePath = 'source/figma/sidebar-layout-update.json';
const layoutUpdate = JSON.parse(fs.readFileSync(layoutUpdatePath, 'utf8'));
raw.sets = layoutUpdate.sets;
raw.assets = [...raw.assets.filter(asset => asset.kind !== 'shell'), ...layoutUpdate.assets];
raw.source = { ...raw.source, layoutUpdateSource: layoutUpdatePath, layoutUpdatedAt: layoutUpdate.source.capturedAt };
raw.decisions = { ...raw.decisions, layoutUpdate: layoutUpdate.changes };
const styles = JSON.parse(fs.readFileSync('src/tokens/styles.json', 'utf8'));
const aliases = [];
const ids = {
  'Главная': 'home', 'Пользователи': 'users', 'Ресурсы': 'resources', 'Шаблоны': 'templates',
  'Рабочие станции': 'workstations', 'Серверы': 'servers', 'Администрирование': 'administration',
  'Лицензирование': 'licensing', 'Журнал': 'journal', 'Информация': 'information', 'ККП': 'kkp',
};
const required = (node, key) => {
  if (!Object.hasOwn(node.properties, key)) throw Error(`Missing ${key}: ${node.id}`);
  return node.properties[key];
};
const px = value => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw Error('Missing Sidebar geometry');
  return `${value}px`;
};
function color(node) {
  const paints = required(node, 'fills').filter(p => p.visible !== false);
  if (paints.length !== 1 || paints[0].type !== 'SOLID' || paints[0].opacity !== 1) throw Error(`Unsupported Sidebar background: ${node.id}`);
  const styleId = required(node, 'fillStyleId');
  const token = styles.colors.find(s => s.id === styleId);
  const fresh = raw.styles.paints.find(s => s.id === styleId);
  if (!token || !fresh || JSON.stringify(token.raw.paints) !== JSON.stringify(fresh.paints)) throw Error(`Missing/stale Sidebar style: ${styleId}`);
  aliases.push({ nodeId: node.id, styleId, cssVariable: token.cssVariable });
  return `var(${token.cssVariable})`;
}
function audit(node) {
  if (node.childCount !== undefined && node.childCount !== (node.children ?? []).length) throw Error(`Incomplete Sidebar source: ${node.id}`);
  if (Object.keys(required(node, 'boundVariables')).length) throw Error(`Variable consumer resolution needed: ${node.id}`);
  for (const warning of node.warnings ?? []) {
    // Original shell/icon SVGs retain exact vector rendering, including mixed vector radii.
    if (node.type === 'VECTOR' && ['VECTOR requires SVG or asset export for exact rendering', 'cornerRadius has mixed values'].includes(warning)) continue;
    if (warning === 'strokeWeight has mixed values' && required(node, 'strokes').every(s => s.visible === false)) continue;
    throw Error(`${warning}: ${node.id}`);
  }
  for (const child of node.children ?? []) audit(child);
}
function parts(item) {
  const content = item.children.find(c => c.name === 'Content');
  const label = content?.children.find(c => c.type === 'TEXT');
  const icon = content?.children.find(c => c.type === 'INSTANCE');
  if (!label || !icon) throw Error(`Missing MenuButton composition: ${item.id}`);
  return { label, icon };
}
const variants = [];
for (const [theme, set] of Object.entries(raw.sets)) {
  if (set.warnings.length || set.childCount !== set.children.length) throw Error('Incomplete Sidebar set');
  for (const node of set.children) {
    audit(node);
    const layout = node.properties.variantProperties.layout;
    if (!['expanded', 'compact'].includes(layout) || node.properties.variantProperties.theme !== theme) throw Error('Unknown Sidebar schema');
    const nav = node.children.find(c => c.name === 'Navigation');
    const title = node.children.find(c => c.name === 'ProductName');
    if (!nav || !title || nav.properties.layoutMode !== 'VERTICAL' || node.properties.layoutMode !== 'NONE') throw Error('Unsupported Sidebar layout');
    variants.push({ theme, layout, node, nav, title });
  }
}
const expanded = Object.fromEntries(['dark', 'light'].map(theme => [theme, variants.find(v => v.theme === theme && v.layout === 'expanded')]));
const labelsFor = v => v.nav.children.map(n => parts(n).label.characters);
const order = [...labelsFor(expanded.dark)];
const lightOrder = labelsFor(expanded.light);
for (const [index, label] of lightOrder.entries()) {
  if (order.includes(label)) continue;
  const next = lightOrder.slice(index + 1).find(l => order.includes(l));
  order.splice(next ? order.indexOf(next) : order.length, 0, label);
}
if (new Set(order).size !== order.length || order.some(l => !ids[l])) throw Error('Ambiguous Sidebar item identity');

fs.mkdirSync('src/assets/sidebars', { recursive: true });
const assets = [];
function saveAsset(file, svg, source, derived = false) {
  fs.writeFileSync(`src/assets/sidebars/${file}`, svg);
  const key = `asset${assets.length}`;
  assets.push({ key, file, sourceNodeId: source.nodeId, variantNodeId: source.variantNodeId, kind: source.kind,
    sha256: createHash('sha256').update(svg).digest('hex'), derived });
  return key;
}
const iconAssets = new Map();
for (const asset of raw.assets.filter(a => a.kind === 'icon')) {
  const file = `icon-${asset.nodeId.replaceAll(/[^a-zA-Z0-9-]/g, '-')}.svg`;
  iconAssets.set(asset.nodeId, saveAsset(file, asset.svg, asset));
}
const records = [];
for (const v of variants) {
  const original = raw.assets.find(a => a.kind === 'shell' && a.nodeId === v.node.id);
  if (!original) throw Error('Missing native Sidebar SVG');
  const openEnd = original.svg.indexOf('>') + 1;
  const open = original.svg.slice(0, openEnd);
  const inner = original.svg.slice(openEnd, original.svg.lastIndexOf('</svg>'));
  const svgWidth = Number(open.match(/width="([\d.]+)"/)?.[1]);
  const svgHeight = Number(open.match(/height="([\d.]+)"/)?.[1]);
  if (!svgWidth || !svgHeight) throw Error('Missing native SVG export dimensions');
  // Preserve original title glyph paths, logo, background and divider. Remove the old
  // navigation pixels; the only rendered navigation comes from live MenuButton/Badge.
  const maskId = 'sidebar-navigation-cutout';
  const backdrop = `${open}\n<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${svgWidth}" height="${svgHeight}"><rect width="${svgWidth}" height="${svgHeight}" fill="white"/><rect x="${v.nav.x}" y="${v.nav.y}" width="${v.nav.width}" height="${v.nav.height}" fill="black"/></mask></defs>\n<g mask="url(#${maskId})">${inner}</g></svg>\n`;
  const backdropKey = saveAsset(`shell-${v.theme}-${v.layout}.svg`, backdrop, original, true);
  const footer = v.node.children.find(c => c.name === 'Footer');
  const divider = v.node.children.find(c => c.name === 'Divider');
  if (!footer || !divider || divider.x !== v.node.width || svgWidth <= divider.x) throw Error('Missing responsive Sidebar source');
  function cropAsset(kind, node, width = node.width) {
    let croppedOpen = open.replace(/width="[^"]+"/, `width="${width}"`).replace(/height="[^"]+"/, `height="${node.height}"`)
      .replace(/viewBox="[^"]+"/, `viewBox="${node.x} ${node.y} ${width} ${node.height}"`);
    if (kind === 'divider') croppedOpen = croppedOpen.replace(/>$/, ' preserveAspectRatio="none">');
    const key = saveAsset(`${kind}-${v.theme}-${v.layout}.svg`, `${croppedOpen}${inner}</svg>\n`, { ...original, nodeId: node.id, kind }, true);
    return { key, width, height: node.height, sourceNodeId: node.id };
  }
  const titleAsset = cropAsset('title', v.title);
  const footerAsset = cropAsset('footer', footer);
  const dividerAsset = cropAsset('divider', divider, svgWidth - divider.x);
  const items = order.map(label => {
    const localExpanded = expanded[v.theme].nav.children.find(item => parts(item).label.characters === label);
    const otherTheme = v.theme === 'light' ? 'dark' : 'light';
    const counterpart = expanded[otherTheme].nav.children.find(item => parts(item).label.characters === label);
    const anchor = localExpanded ?? counterpart;
    if (!anchor) throw Error(`Missing menu source: ${label}`);
    const sourceTheme = localExpanded ? v.theme : otherTheme;
    const sourceLayout = variants.find(row => row.theme === sourceTheme && row.layout === v.layout);
    // Compact source labels contain stale hidden text. Match the visible expanded entry
    // to its same-position compact counterpart, checking the icon's source component.
    const anchorIcon = parts(anchor).icon;
    const atPosition = sourceLayout.nav.children.find(item => item.y === anchor.y);
    const matchingIcon = sourceLayout.nav.children.filter(item => parts(item).icon.properties.mainComponent?.id === anchorIcon.properties.mainComponent?.id);
    let sourceItem = v.layout === 'expanded' ? anchor : matchingIcon.length === 1 ? matchingIcon[0] : atPosition;
    // User icons differ between expanded/compact; the native slot at the corresponding
    // position is retained when no unique shared icon component exists.
    if (!sourceItem) sourceItem = atPosition;
    if (!sourceItem) throw Error(`Unresolved compact counterpart: ${label}`);
    const { label: sourceLabel, icon } = parts(sourceItem);
    const assetKey = iconAssets.get(icon.id);
    if (!assetKey) throw Error(`Missing icon SVG: ${icon.id}`);
    const sourceState = sourceItem.properties.variantProperties.state;
    return { id: ids[label], label, sourceNodeId: sourceItem.id, labelNodeId: sourceLabel.id, sourceText: sourceLabel.characters,
      iconNodeId: icon.id, iconMainComponent: icon.properties.mainComponent, assetKey, iconWidth: icon.width, iconHeight: icon.height,
      sourceState, sourceTheme: sourceItem.properties.variantProperties.theme,
      origin: localExpanded ? 'figma' : 'derived', positionOrigin: 'derived/theme-symmetry',
      appearanceSource: 'MenuButton', badgeSource: 'Badge', themeAdapted: sourceItem.properties.variantProperties.theme !== v.theme,
      accessibleLabelOrigin: sourceLabel.characters === label ? 'figma' : 'derived/expanded-label' };
  });
  records.push({ theme: v.theme, layout: v.layout, nodeId: v.node.id, productName: v.title.characters,
    backdropKey, backdropWidth: svgWidth, backdropHeight: svgHeight, titleAsset, footerAsset, dividerAsset, items,
    defaultSelectedId: items.find(item => item.sourceState === 'active')?.id ?? null,
    css: { width: px(v.node.width), height: px(v.node.height), background: color(v.node),
      'nav-x': px(v.nav.x), 'nav-y': px(v.nav.y), 'nav-width': px(v.nav.width), 'nav-gap': px(v.nav.properties.itemSpacing),
      'title-x': px(v.title.x), 'title-y': px(v.title.y), 'footer-x': px(footer.x),
      'footer-bottom': px(v.node.height - footer.y - footer.height), 'footer-height': px(footer.height),
      'divider-width': px(dividerAsset.width) },
    sourceNavHeight: v.nav.height, derivedNavHeight: items.length * v.nav.children[0].height + (items.length - 1) * v.nav.properties.itemSpacing,
    footerNodeId: v.node.children.find(c => c.name === 'Footer')?.id ?? null });
}
const itemIds = order.map(label => ids[label]);
fs.writeFileSync('src/tokens/sidebars.json', JSON.stringify({ source: raw.source, definitions: Object.fromEntries(Object.entries(raw.sets).map(([theme, set]) => [theme, set.properties.componentPropertyDefinitions])), itemIds, records, aliases, assets, variables: raw.variables, decisions: raw.decisions }, null, 2) + '\n');
fs.writeFileSync('src/tokens/sidebar-api.ts', `// Generated from selected Sidebar sources and explicit semantic item IDs.\nexport const sidebarItemIds = ${JSON.stringify(itemIds)} as const;\nexport type SidebarItemId = typeof sidebarItemIds[number];\n`);
fs.writeFileSync('src/assets/sidebars/index.ts', '// Generated SVG source assets.\n' + assets.map((a, i) => `import svg${i} from './${a.file}';`).join('\n') + '\nexport const sidebarAssets: Record<string, string> = {\n' + assets.map((a, i) => `  ${a.key}: svg${i},`).join('\n') + '\n};\n');
const css = ['/* Generated from source/figma/sidebar-export.json. Do not edit. */'];
for (const r of records) {
  css.push(`[data-sidebar][data-sidebar-theme="${r.theme}"][data-sidebar-layout="${r.layout}"] {`);
  for (const [key, value] of Object.entries(r.css)) css.push(`  --sidebar-${key}: ${value};`);
  css.push('}');
}
fs.writeFileSync('src/styles/sidebar-tokens.css', css.join('\n') + '\n');
console.log(`Sidebar: ${records.length} original layouts, ${itemIds.length} symmetric menu entries, ${assets.length} sourced SVG assets.`);
