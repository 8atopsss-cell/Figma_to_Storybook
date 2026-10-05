import fs from 'node:fs';
const raw = JSON.parse(fs.readFileSync('source/figma/toggle-export.json', 'utf8'));
const enableUpdate = JSON.parse(fs.readFileSync('source/figma/toggle-enable-update.json', 'utf8'));
const definitions = raw.tree.properties.componentPropertyDefinitions;
const schema = definitions['Property 1'];
const styles = JSON.parse(fs.readFileSync('src/tokens/styles.json', 'utf8')).colors;
const byId = new Map(styles.map(s => [s.id, s]));
const additions = JSON.parse(fs.readFileSync('source/figma/toggle-light-additions.json', 'utf8'));
for (const paint of [...additions.paints, ...enableUpdate.paints]) {
  const token = byId.get(paint.id);
  if (!token || JSON.stringify(token.raw.paints) !== JSON.stringify(paint.paints)) throw Error('Refresh color token from live Figma: ' + paint.name);
}
const palette = node => {
  const token = byId.get(node.properties.fillStyleId);
  if (!token) throw Error('Missing Toggle color token: ' + node.id);
  return { styleId: token.id, name: token.name, cssVariable: token.cssVariable, value: token.value };
};
const color = node => {
  const paints = node.properties.fills.filter(p => p.visible);
  if (paints.length !== 1 || paints[0].type !== 'SOLID' || paints[0].blendMode !== 'NORMAL') throw new Error('Unsupported Toggle paint: ' + node.id);
  const paint = paints[0];
  if (paint.opacity !== 1 || node.properties.opacity !== 1) throw Error('Unsupported Toggle opacity');
  return `var(${palette(node).cssVariable})`;
};
const records = raw.tree.children.map(original => {
  const node = original.id === enableUpdate.tree.id ? enableUpdate.tree : original;
  const variant = node.properties.variantProperties['Property 1'];
  if (!schema.variantOptions.includes(variant)) throw new Error('Unknown Toggle variant');
  const track = node.children.find(n => n.type === 'RECTANGLE');
  const thumb = node.children.find(n => n.type === 'ELLIPSE');
  if (!track || !thumb || node.children.length !== 2 || node.properties.fills.length || node.properties.strokes.length) throw new Error('Unsupported Toggle geometry');
  for (const child of [track, thumb]) if (child.properties.strokes.length || child.properties.effects.length || child.properties.rotation !== 0) throw new Error('Unsupported Toggle effects');
  return { nodeId: node.id, variant, theme: variant.endsWith('light') ? 'light' : 'dark', checked: thumb.x >= node.width / 2, disabled: variant.startsWith('unactive'), nextVariant: variant === 'Enable danger dark' ? 'disable dark' : variant === 'disable dark' ? 'Enable dark' : variant === 'Enable dark' ? 'disable dark' : variant === 'disable light' ? 'enable light' : variant === 'enable light' ? 'disable light' : variant, css: { width: node.width + 'px', height: node.height + 'px', 'track-x': track.x + 'px', 'track-y': track.y + 'px', 'track-width': track.width + 'px', 'track-height': track.height + 'px', 'track-radius': track.properties.cornerRadius + 'px', 'track-color': color(track), 'thumb-x': thumb.x + 'px', 'thumb-y': thumb.y + 'px', 'thumb-width': thumb.width + 'px', 'thumb-height': thumb.height + 'px', 'thumb-color': color(thumb) }, source: node };
});
for (const row of records) {
  row.origin = 'figma';
  row.sourceRef = row.nodeId === enableUpdate.tree.id ? enableUpdate.source : raw.source;
  row.palette = { track: palette(row.source.children[0]), thumb: palette(row.source.children[1]) };
}
const light = records.find(r => r.variant === 'disable light');
const disabledLight = records.find(r => r.variant === 'unactive light');
const successToken = styles.find(s => s.name === 'light theme/status/light_status_success');
if (!successToken) throw Error('Missing light success token');
const successPalette = { styleId: successToken.id, name: successToken.name, cssVariable: successToken.cssVariable, value: successToken.value };
for (const [variant, baseVariant, track, thumb] of [
  ['unactive off light', 'unactive off dark', light.palette.track, disabledLight.palette.thumb],
  ['Enable success light', 'Enable dark', light.palette.track, successPalette],
]) {
  const base = records.find(r => r.variant === baseVariant);
  const css = { ...base.css, 'track-color': `var(${track.cssVariable})`, 'thumb-color': `var(${thumb.cssVariable})` };
  records.push({ ...base, nodeId: null, sourceRef: null, variant, theme: 'light', origin: 'derived',
    nextVariant: variant === 'Enable success light' ? 'disable light' : variant,
    css, palette: { track, thumb },
    derivation: { geometryNodeId: base.nodeId, geometryVariant: baseVariant, paletteSource: additions.source,
      decision: variant === 'Enable success light' ? enableUpdate.decision : 'User requested two missing light states from dark analogues using current light color tokens',
      ...(variant === 'Enable success light' ? { geometrySource: enableUpdate.source } : {}) } });
}
// Public aliases requested by the user; original Figma names/schema remain intact.
const variantAliases = { 'enable light': 'Enable danger light', 'unactive light': 'unactive on light', 'Enable success light': 'Enable light' };
for (const row of records) {
  row.sourceVariant = row.origin === 'figma' ? row.variant : null;
  row.variant = variantAliases[row.variant] ?? row.variant;
  row.nextVariant = row.variant === 'disable light' ? 'Enable light' : variantAliases[row.nextVariant] ?? row.nextVariant;
}
const stateOrder = ['disable', 'Enable', 'Enable danger', 'unactive on', 'unactive off'];
const variantsByTheme = Object.fromEntries(['light', 'dark'].map(theme => [theme, stateOrder.map(state => `${state} ${theme}`)]));
records.sort((a, b) => variantsByTheme[a.theme].indexOf(a.variant) - variantsByTheme[b.theme].indexOf(b.variant));
const tokens = { schemaVersion: 1, source: raw.source, enableUpdateSource: enableUpdate.source, definitions, defaultVariant: schema.defaultValue, variantAliases, variantsByTheme, variants: records.map(r => r.variant), records };
fs.writeFileSync('src/tokens/toggles.json', JSON.stringify(tokens, null, 2) + '\n');
const css = ['/* Generated from fresh Figma Toggle nodes. Do not edit. */'];
for (const row of records) {
  css.push(`[data-toggle-variant=${JSON.stringify(row.variant)}] {`);
  for (const [field, value] of Object.entries(row.css)) css.push(`  --toggle-${field}: ${value};`);
  css.push('}');
}
fs.writeFileSync('src/styles/toggle-tokens.css', css.join('\n') + '\n');
console.log('Toggle: 8 Figma variants + 2 user-authorized light additions.');
