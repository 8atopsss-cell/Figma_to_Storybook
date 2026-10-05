import fs from 'node:fs';
import { createHash } from 'node:crypto';

export const raw = JSON.parse(fs.readFileSync('source/figma/table-row-export.json', 'utf8'));
export const headerPlayUpdate = JSON.parse(fs.readFileSync('source/figma/table-row-header-play.json', 'utf8'));
export const excludedVariants = ['expanded', 'expanded  hover'];
export const knownKind = node => {
  if (node.type !== 'INSTANCE') return null;
  if (node.name.startsWith('chekbox')) return 'checkbox';
  if (node.name === 'toggle') return 'toggle';
  if (node.name.startsWith('resource tag')) return 'resource';
  if (node.name.startsWith('icon btn')) return 'iconButton';
  if (node.name.startsWith('button ')) return 'button';
  return null;
};
export function signature(node, root = true) {
  const p = node.properties;
  return { type: node.type, main: p.mainComponent?.id, width: node.width, height: node.height,
    ...(!root ? { x: node.x, y: node.y } : {}), visible: p.visible, opacity: p.opacity,
    fills: p.fills, strokes: p.strokes, strokeWeight: p.strokeWeight, strokeAlign: p.strokeAlign,
    rotation: p.rotation, radii: p.rectangleCornerRadii, dashPattern: p.dashPattern,
    children: node.children?.map(child => signature(child, false)) };
}
export const assetKey = node => createHash('sha256').update(JSON.stringify(signature(node))).digest('hex').slice(0, 20);
function replaceHeaderPlay(node, theme) {
  const replacement = headerPlayUpdate.replacements[theme];
  if (node.id === replacement.oldNodeId) return headerPlayUpdate.nodes[theme];
  return node.children ? { ...node, children: node.children.map(child => replaceHeaderPlay(child, theme)) } : node;
}
export const rows = raw.sets.flatMap(set => set.children
  .filter(node => !excludedVariants.includes(node.properties.variantProperties['Property 1']))
  .map(node => {
    const theme = set.name.endsWith('dark') ? 'dark' : 'light';
    return { theme, set, node: node.properties.variantProperties['Property 1'] === 'header' ? replaceHeaderPlay(node, theme) : node };
  }));

export function assetNodes(node) {
  if (!node.properties.visible && !node.properties.componentPropertyReferences?.visible) return [];
  const kind = knownKind(node);
  if (kind === 'checkbox' || kind === 'toggle' || kind === 'resource') return [];
  if (kind === 'iconButton') return node.children.filter(child => child.properties.visible && child.type !== 'RECTANGLE');
  if (kind === 'button') return node.children.filter(child => child.type !== 'TEXT' && child.properties.visible);
  if (node.type === 'VECTOR' && (node.width === 0 || node.height === 0)) return [];
  if (node.type === 'INSTANCE' || ['VECTOR', 'BOOLEAN_OPERATION'].includes(node.type)) return [node];
  return (node.children ?? []).flatMap(assetNodes);
}
