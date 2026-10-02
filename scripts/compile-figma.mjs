const cornerFields = ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'];
const geometryFields = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing'];
const normalizeVariant = (value) => value === 'ghost orange' ? 'ghost-orange' : value;

function read(object, field, nodeId) {
  if (!Object.hasOwn(object, field)) throw new Error(nodeId + ': missing ' + field);
  return object[field];
}

function number(object, field, nodeId) {
  const value = read(object, field, nodeId);
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(nodeId + ': invalid ' + field);
  return value;
}

export function paintColor(paint) {
  if (paint.type !== 'SOLID' || paint.blendMode !== 'NORMAL') throw new Error('Unsupported paint: ' + paint.type);
  const opacity = number(paint, 'opacity', 'paint');
  const channels = ['r', 'g', 'b'].map(c => Math.round(number(paint.color, c, 'paint.color') * 255));
  return 'rgba(' + channels.join(', ') + ', ' + opacity + ')';
}

function paintsColor(paints, nodeId, field) {
  if (!Array.isArray(paints)) throw new Error(nodeId + ': invalid ' + field);
  const visible = paints.filter(p => {
    const visibility = read(p, 'visible', nodeId + '.' + field);
    if (typeof visibility !== 'boolean') throw new Error(nodeId + ': invalid paint visibility');
    return visibility;
  });
  if (visible.length > 1) throw new Error(nodeId + ': multiple visible ' + field + ' need explicit mapping');
  return visible.length ? paintColor(visible[0]) : 'rgba(0, 0, 0, 0)';
}

function walk(node, visit) {
  visit(node);
  node.children?.forEach(child => walk(child, visit));
}

export function compileFigma(source) {
  const records = [];
  const schemas = {};
  const surfaces = {};
  const usedVariables = new Map();
  for (const theme of ['light', 'dark']) {
    const set = source[theme];
    if (set.childCount !== set.children.length) throw new Error(theme + ': incomplete root children');
    schemas[theme] = read(set.properties, 'componentPropertyDefinitions', set.id);
    const graph = source.variables[theme];
    if (graph.warnings.length || graph.pagination.nextOffset !== null) throw new Error(theme + ': incomplete variables');
    const surface = source.styles.paints.find(s => s.name === theme + ' theme/background/' + theme + '_page bcg');
    if (!surface) throw new Error(theme + ': surface style unavailable');
    surfaces[theme] = { color: paintsColor(surface.paints, surface.id, 'paints'), sourceStyleId: surface.id, sourceName: surface.name };
    for (const node of set.children) {
      walk(node, child => {
        for (const warning of child.warnings ?? []) {
          if (!warning.includes('requires SVG or asset export')) throw new Error(child.id + ': ' + warning);
        }
        if (child.childCount !== undefined && child.childCount !== (child.children?.length ?? 0)) throw new Error(child.id + ': omitted descendants');
      });
      const p = node.properties;
      const variant = read(p, 'variantProperties', node.id);
      if (variant.type === 'interactive') continue; // Explicitly deferred by accepted contract.
      const label = node.children.find(c => c.type === 'TEXT');
      const icon = node.children.find(c => c.type === 'INSTANCE' && c.properties.visible);
      if (!label || !icon) throw new Error(node.id + ': label/icon source missing');
      const text = label.properties;
      if (read(text, 'effects', label.id).length) throw new Error(label.id + ': unsupported text effects');
      if (read(text, 'strokes', label.id).some(s => read(s, 'visible', label.id))) throw new Error(label.id + ': unsupported text strokes');
      if (label.textSegments.length !== 1) throw new Error(label.id + ': mixed typography needs a separate mapping');
      const segment = label.textSegments[0];
      if (!read(p, 'visible', node.id) || !read(text, 'visible', label.id)) throw new Error(node.id + ': unexpected hidden variant');
      if (read(p, 'layoutMode', node.id) !== 'HORIZONTAL' || read(p, 'layoutSizingHorizontal', node.id) !== 'HUG' ||
          read(p, 'layoutSizingVertical', node.id) !== 'FIXED' || read(p, 'primaryAxisAlignItems', node.id) !== 'CENTER' ||
          read(p, 'counterAxisAlignItems', node.id) !== 'CENTER') throw new Error(node.id + ': unsupported layout');
      if (read(p, 'effects', node.id).length || number(p, 'cornerSmoothing', node.id) !== 0 ||
          read(p, 'dashPattern', node.id).length || read(text, 'textDecoration', label.id) !== 'NONE') throw new Error(node.id + ': unsupported visual effect');
      const font = read(text, 'fontName', label.id);
      if (font.family !== 'PT Root UI' || font.style !== 'Bold') throw new Error(label.id + ': font asset not covered');
      const lineHeight = read(text, 'lineHeight', label.id);
      const letterSpacing = read(text, 'letterSpacing', label.id);
      if (lineHeight.unit !== 'PIXELS' || letterSpacing.unit !== 'PIXELS' || read(text, 'textCase', label.id) !== 'UPPER') throw new Error(label.id + ': unsupported typography units');
      const size = Number.parseInt(variant.size);
      if (![32, 40].includes(size)) throw new Error(node.id + ': unsupported size');
      const bindings = read(p, 'boundVariables', node.id);
      const radii = Object.fromEntries(cornerFields.map(field => [field, number(p, field, node.id)]));
      for (const [field, binding] of Object.entries(bindings)) {
        if (!cornerFields.includes(field)) throw new Error(node.id + ': unhandled binding ' + field);
        const variable = graph.variables.find(v => v.id === binding.id);
        const resolution = graph.nodeResolutions.find(r => r.variableId === binding.id);
        if (!variable || !resolution || resolution.status !== 'resolved' || !resolution.resolvedForConsumer ||
            resolution.resolvedForConsumer.value !== radii[field]) throw new Error(node.id + ': unresolved binding ' + field);
        const mode = read(p, 'resolvedVariableModes', node.id)[variable.variableCollectionId];
        if (mode !== graph.nodeContext.resolvedVariableModes[variable.variableCollectionId]) throw new Error(node.id + ': variable consumer context differs');
        usedVariables.set(variable.id, { ...variable, cssName: '--figma-' + variable.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), nativeValue: resolution.resolvedForConsumer.value });
      }
      const color = paintsColor(read(text, 'fills', label.id), label.id, 'fills');
      const vectors = [];
      walk(icon, child => {
        const properties = child.properties;
        if (!read(properties, 'visible', child.id)) throw new Error(child.id + ': unsupported icon visibility');
        if (number(properties, 'opacity', child.id) !== 1) throw new Error(child.id + ': unsupported icon opacity');
        if (read(properties, 'effects', child.id).length) throw new Error(child.id + ': unsupported icon effects');
        if (!['NORMAL', 'PASS_THROUGH'].includes(read(properties, 'blendMode', child.id))) throw new Error(child.id + ': unsupported icon blendMode');
        if (child.type === 'VECTOR') vectors.push(child);
      });
      if (vectors.length !== 1 || vectors[0].width !== 14 || vectors[0].height !== 14 ||
          paintsColor(read(vectors[0].properties, 'fills', vectors[0].id), vectors[0].id, 'fills') !== color) throw new Error(node.id + ': icon cannot safely use shared geometry/currentColor');
      const strokes = read(p, 'strokes', node.id);
      const outlineColor = paintsColor(strokes, node.id, 'strokes');
      const hasStroke = strokes.some(s => s.visible);
      if (hasStroke && read(p, 'strokeAlign', node.id) !== 'INSIDE') throw new Error(node.id + ': unsupported stroke alignment');
      const height = number(node, 'height', node.id);
      const decisions = [];
      if (height !== size) {
        if (height === 39 && size === 40 && variant.type === 'danger' && variant.state === 'disable') decisions.push('User-approved minimum height 39 -> 40');
        else throw new Error(node.id + ': unexpected height');
      }
      const css = {
        background: paintsColor(read(p, 'fills', node.id), node.id, 'fills'),
        color, outlineColor, outlineWidth: hasStroke ? number(p, 'strokeWeight', node.id) : 0,
        height: size, ...radii,
        ...Object.fromEntries(geometryFields.map(field => [field, number(p, field, node.id)])),
        fontFamily: font.family, fontSize: number(text, 'fontSize', label.id),
        fontWeight: number(segment, 'fontWeight', label.id), lineHeight: number(lineHeight, 'value', label.id),
        letterSpacing: number(letterSpacing, 'value', label.id),
        featureSettings: Object.entries(read(text, 'openTypeFeatures', label.id)).map(([tag, value]) => '"' + tag.toLowerCase() + '" ' + (value ? 1 : 0)).join(', '),
        opacity: number(p, 'opacity', node.id), textOpacity: number(text, 'opacity', label.id),
        iconWidth: number(icon, 'width', icon.id), iconHeight: number(icon, 'height', icon.id),
      };
      records.push({
        theme, variant: normalizeVariant(variant.type), state: variant.state, size, nodeId: node.id, labelId: label.id,
        css, bindings, explicitVariableModes: read(p, 'explicitVariableModes', node.id),
        resolvedVariableModes: read(p, 'resolvedVariableModes', node.id), decisions,
        source: { file: source.fileName, setId: set.id, nodeId: node.id, labelId: label.id, iconWrapperId: icon.id, height, width: node.width,
          componentFields: ['fills', 'strokes', 'strokeWeight', 'strokeAlign', ...cornerFields, ...geometryFields, 'opacity', 'layoutMode'],
          labelFields: ['fills', 'fontName', 'fontSize', 'lineHeight', 'letterSpacing', 'textCase', 'openTypeFeatures', 'opacity'],
          iconFields: ['visible', 'opacity', 'effects', 'blendMode', 'fills', 'width', 'height'],
          fontWeightField: 'textSegments[0].fontWeight', rawFile: 'source/figma/fresh-export.json' }
      });
    }
    const schema = schemas[theme];
    for (const type of schema.type.variantOptions.filter(v => v !== 'interactive')) {
      for (const state of schema.state.variantOptions) for (const size of schema.size.variantOptions) {
        const matches = records.filter(r => r.theme === theme && r.variant === normalizeVariant(type) && r.state === state && r.size === Number.parseInt(size));
        if (matches.length !== 1) throw new Error(theme + ': missing/duplicate ' + [type, state, size].join('/'));
      }
    }
  }
  return { sourceFile: source.fileName, capturedAt: source.capturedAt, schemas, surfaces, figmaVariables: source.variables, usedVariables: [...usedVariables.values()], records };
}
