// Compile local Figma styles, preserving the raw payload separately from CSS values.
const weights = { Regular: 400, Medium: 500, Bold: 700 };
const cases = { ORIGINAL: 'none', UPPER: 'uppercase', LOWER: 'lowercase', TITLE: 'capitalize' };
const decorations = { NONE: 'none', UNDERLINE: 'underline', STRIKETHROUGH: 'line-through' };
function number(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Missing or invalid ' + field);
  return value;
}
function slug(name) {
  if (typeof name !== 'string' || !name.trim()) throw new Error('Missing style name');
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function interval(value, field) {
  if (!value) throw new Error('Missing ' + field);
  if (value.unit === 'AUTO' && field === 'lineHeight') return 'normal';
  if (value.unit === 'PIXELS') return number(value.value, field) + 'px';
  if (value.unit === 'PERCENT') return number(value.value, field) / 100 + 'em';
  throw new Error('Unsupported ' + field + ' unit');
}
export function compileStyles(source) {
  if (!source.fileName || !Array.isArray(source.paints) || !Array.isArray(source.texts)) throw new Error('Incomplete style export');
  const used = new Set();
  function identity(style, kind) {
    if (!style.id) throw new Error('Missing source style ID');
    if (style.warnings?.length) throw new Error('Unresolved warnings: ' + style.name);
    const key = kind + '-' + slug(style.name);
    if (used.has(key)) throw new Error('Duplicate CSS token name: ' + key);
    used.add(key);
    return { id: style.id, name: style.name, key, sourceFile: source.fileName, sourcePath: 'source/figma/styles-export.json', raw: style };
  }
  const colors = source.paints.map(style => {
    const record = identity(style, 'color');
    if (style.paints?.length !== 1) throw new Error('Unsupported layered paint: ' + style.name);
    const paint = style.paints[0];
    if (paint.type !== 'SOLID' || paint.visible !== true || paint.blendMode !== 'NORMAL') throw new Error('Unsupported paint: ' + style.name);
    if (Object.keys(paint.boundVariables ?? {}).length) throw new Error('Variable resolution required: ' + style.name);
    const alpha = number(paint.opacity, 'opacity');
    const rgb = ['r', 'g', 'b'].map(channel => number(paint.color?.[channel], channel));
    if ([...rgb, alpha].some(value => value < 0 || value > 1)) throw new Error('Paint channel outside 0..1');
    const values = rgb.map(value => Math.round(value * 255));
    const hex = '#' + values.map(value => value.toString(16).padStart(2, '0')).join('');
    const value = alpha === 1 ? hex : 'rgba(' + values.join(', ') + ', ' + alpha + ')';
    const theme = style.name.startsWith('light theme/') ? 'light' : style.name.startsWith('dark theme/') ? 'dark' : 'shared';
    return { ...record, cssVariable: '--figma-' + record.key, value, hex, alpha, theme };
  });
  const typography = source.texts.map(style => {
    const record = identity(style, 'text');
    const p = style.properties;
    if (!p || style.fontName?.family !== 'PT Root UI' || !Object.hasOwn(weights, style.fontName.style)) throw new Error('Unsupported or missing typography: ' + style.name);
    if (!Object.hasOwn(cases, p.textCase) || !Object.hasOwn(decorations, p.textDecoration)) throw new Error('Unsupported text case/decoration: ' + style.name);
    if (number(style.fontSize, 'fontSize') <= 0) throw new Error('Invalid fontSize');
    const css = {
      'font-family': '"PT Root UI"', 'font-weight': weights[style.fontName.style],
      'font-size': style.fontSize + 'px', 'line-height': interval(p.lineHeight, 'lineHeight'),
      'letter-spacing': interval(p.letterSpacing, 'letterSpacing'),
      'text-transform': cases[p.textCase], 'text-decoration': decorations[p.textDecoration],
      'text-indent': number(p.paragraphIndent, 'paragraphIndent') + 'px',
      'paragraph-spacing': number(p.paragraphSpacing, 'paragraphSpacing') + 'px',
      'list-spacing': number(p.listSpacing, 'listSpacing') + 'px',
    };
    return { ...record, className: 'figma-' + record.key, css, unavailableFields: ['openTypeFeatures'] };
  });
  return { source: { fileName: source.fileName, pageId: source.pageId, exportedAt: source.exportedAt, tool: source.tool }, colors, typography };
}
