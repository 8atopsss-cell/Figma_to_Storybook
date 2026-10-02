import fs from 'node:fs';
import { createHash } from 'node:crypto';
const raw = JSON.parse(fs.readFileSync('source/figma/checkbox-export.json', 'utf8'));
const color = node => {
  const paint = node.properties.fills.find(p => p.visible && p.type === 'SOLID');
  if (!paint) throw new Error('Missing paint: ' + node.id);
  const { r, g, b } = paint.color;
  return `rgb(${r * 255} ${g * 255} ${b * 255} / ${paint.opacity * node.properties.opacity})`;
};
const records = [];
const css = ['/* Generated from fresh Checkbox Figma nodes. Do not edit. */'];
for (const theme of ['light', 'dark']) {
  const variants = raw.trees[theme].children;
  const find = state => variants.find(n => n.properties.variantProperties['Property 1'] === state);
  const enabled = find('enable');
  const text = enabled.children.find(n => n.type === 'TEXT');
  const skeleton = find('skeleton').children.find(n => n.type === 'RECTANGLE');
  const group = raw.trees['group' + theme[0].toUpperCase() + theme.slice(1)];
  const heading = group.children.find(n => n.type === 'TEXT');
  if (text.properties.fontName.style !== 'Medium' || heading.properties.fontName.style !== 'Bold') throw new Error('Unsupported source font weight');
  for (const node of variants) {
    if (node.children[0].width !== enabled.children[0].width || node.children[0].height !== enabled.children[0].height || node.properties.itemSpacing !== enabled.properties.itemSpacing) throw new Error('Mixed Checkbox geometry: ' + node.id);
    const label = node.children.find(n => n.type === 'TEXT');
    if (label) {
      for (const field of ['fontName', 'fontSize', 'lineHeight', 'letterSpacing', 'openTypeFeatures']) if (JSON.stringify(label.properties[field]) !== JSON.stringify(text.properties[field])) throw new Error('Mixed Checkbox typography: ' + node.id);
      if (label.properties.lineHeight.unit !== 'PIXELS' || label.properties.letterSpacing.unit !== 'PIXELS') throw new Error('Unsupported Checkbox units');
      const expected = node.properties.variantProperties['Property 1'].startsWith('disabled') ? find('disabled unselected').children.find(n => n.type === 'TEXT') : text;
      if (color(label) !== color(expected)) throw new Error('Unsupported state-specific label paint: ' + node.id);
    }
  }
  css.push(`[data-theme="${theme}"] {`);
  const fields = {
    'size': enabled.children[0].width + 'px', 'gap': enabled.properties.itemSpacing + 'px',
    'font-family': JSON.stringify(text.properties.fontName.family), 'font-weight': '500',
    'font-size': text.properties.fontSize + 'px', 'line-height': text.properties.lineHeight.value + 'px',
    'letter-spacing': text.properties.letterSpacing.value + 'px',
    'color': color(text), 'disabled-color': color(find('disabled unselected').children.find(n => n.type === 'TEXT')),
    'skeleton-color': color(skeleton), 'skeleton-width': skeleton.width + 'px',
    'skeleton-height': skeleton.height + 'px', 'skeleton-radius': skeleton.properties.cornerRadius + 'px',
    'group-gap': group.properties.itemSpacing + 'px', 'heading-weight': '700',
    'heading-size': heading.properties.fontSize + 'px', 'heading-line-height': heading.properties.lineHeight.value + 'px',
    'heading-spacing': heading.properties.letterSpacing.value + 'px', 'heading-color': color(heading),
  };
  for (const [key, value] of Object.entries(fields)) css.push(`  --checkbox-${key}: ${value};`);
  for (const scope of ['labelled', 'icon']) for (const asset of raw.assets.filter(a => a.theme === theme && a.scope === scope)) {
    const state = asset.state.toLowerCase().replace(/\s+/g, '-');
    css.push(`  --checkbox-${scope}-${state}: url("../assets/checkboxes/${asset.file}");`);
  }
  css.push('}');
  for (const node of variants) records.push({ theme, scope: 'labelled', nodeId: node.id, sourceState: node.properties.variantProperties['Property 1'], nativeState: node.properties.variantProperties['Property 1'] === 'Variant7' ? 'indeterminate' : node.properties.variantProperties['Property 1'], source: node });
  for (const node of raw.trees['icon' + theme[0].toUpperCase() + theme.slice(1)].children) records.push({ theme, scope: 'icon', nodeId: node.id, sourceState: node.properties.variantProperties['Property 1'], source: node });
}
const assets = raw.assets.map(asset => {
  fs.writeFileSync(asset.path, asset.svg.trimEnd() + '\n');
  return { theme: asset.theme, scope: asset.scope, state: asset.state, nodeId: asset.nodeId, file: asset.file, path: asset.path, sha256: createHash('sha256').update(asset.svg.trimEnd() + '\n').digest('hex') };
});
fs.writeFileSync('src/tokens/checkboxes.json', JSON.stringify({ schemaVersion: 1, source: raw.source, records, groups: { dark: raw.trees.groupDark, light: raw.trees.groupLight }, assets }, null, 2) + '\n');
fs.writeFileSync('src/styles/checkbox-tokens.css', css.join('\n') + '\n');
console.log('Exported ' + records.length + ' Checkbox variants and ' + raw.assets.length + ' SVG assets.');
