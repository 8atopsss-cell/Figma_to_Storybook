import fs from 'node:fs';
const raw = JSON.parse(fs.readFileSync('source/figma/toggle-export.json', 'utf8'));
const definitions = raw.tree.properties.componentPropertyDefinitions;
const schema = definitions['Property 1'];
const color = node => {
  const paints = node.properties.fills.filter(p => p.visible);
  if (paints.length !== 1 || paints[0].type !== 'SOLID' || paints[0].blendMode !== 'NORMAL') throw new Error('Unsupported Toggle paint: ' + node.id);
  const paint = paints[0];
  return `rgb(${paint.color.r * 255} ${paint.color.g * 255} ${paint.color.b * 255} / ${paint.opacity * node.properties.opacity})`;
};
const records = raw.tree.children.map(node => {
  const variant = node.properties.variantProperties['Property 1'];
  if (!schema.variantOptions.includes(variant)) throw new Error('Unknown Toggle variant');
  const track = node.children.find(n => n.type === 'RECTANGLE');
  const thumb = node.children.find(n => n.type === 'ELLIPSE');
  if (!track || !thumb || node.children.length !== 2 || node.properties.fills.length || node.properties.strokes.length) throw new Error('Unsupported Toggle geometry');
  for (const child of [track, thumb]) if (child.properties.strokes.length || child.properties.effects.length || child.properties.rotation !== 0) throw new Error('Unsupported Toggle effects');
  return { nodeId: node.id, variant, theme: variant.endsWith('light') ? 'light' : 'dark', checked: thumb.x >= node.width / 2, disabled: variant.startsWith('unactive'), nextVariant: variant === 'Enable danger dark' ? 'disable dark' : variant === 'disable dark' ? 'Enable dark' : variant === 'Enable dark' ? 'disable dark' : variant === 'disable light' ? 'enable light' : variant === 'enable light' ? 'disable light' : variant, css: { width: node.width + 'px', height: node.height + 'px', 'track-x': track.x + 'px', 'track-y': track.y + 'px', 'track-width': track.width + 'px', 'track-height': track.height + 'px', 'track-radius': track.properties.cornerRadius + 'px', 'track-color': color(track), 'thumb-x': thumb.x + 'px', 'thumb-y': thumb.y + 'px', 'thumb-width': thumb.width + 'px', 'thumb-height': thumb.height + 'px', 'thumb-color': color(thumb) }, source: node };
});
const tokens = { schemaVersion: 1, source: raw.source, definitions, defaultVariant: schema.defaultValue, variants: schema.variantOptions, records };
fs.writeFileSync('src/tokens/toggles.json', JSON.stringify(tokens, null, 2) + '\n');
const css = ['/* Generated from fresh Figma Toggle nodes. Do not edit. */'];
for (const row of records) {
  css.push(`[data-toggle-variant=${JSON.stringify(row.variant)}] {`);
  for (const [field, value] of Object.entries(row.css)) css.push(`  --toggle-${field}: ${value};`);
  css.push('}');
}
fs.writeFileSync('src/styles/toggle-tokens.css', css.join('\n') + '\n');
console.log('Exported ' + records.length + ' Toggle source variants.');
