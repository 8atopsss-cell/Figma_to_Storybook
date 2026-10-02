import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileFigma } from '../../scripts/compile-figma.mjs';
const source = JSON.parse(fs.readFileSync('source/figma/fresh-export.json', 'utf8'));
describe('Figma completeness guard', () => {
  it('exports 96 states with original IDs and a verified Figma radius binding', () => {
    const tokens = compileFigma(source);
    expect(tokens.records).toHaveLength(96);
    expect(tokens.records.find(r => r.nodeId === '1900:44829').bindings.topLeftRadius.id).toBe('VariableID:2936:65832');
    expect(tokens.records.find(r => r.nodeId === '4391:92046').bindings).toEqual({});
  });
  it('rejects missing corner data instead of substituting zero', () => {
    const incomplete = structuredClone(source);
    delete incomplete.light.children[0].properties.topLeftRadius;
    expect(() => compileFigma(incomplete)).toThrow(/topLeftRadius/);
  });
  it('rejects a truncated subtree instead of publishing an incomplete specification', () => {
    const incomplete = structuredClone(source);
    incomplete.light.children[0].warnings = ['children omitted by depth limit'];
    expect(() => compileFigma(incomplete)).toThrow(/omitted/);
  });
  it('rejects an unresolved token even if its visual value is present', () => {
    const incomplete = structuredClone(source);
    incomplete.variables.dark.nodeResolutions.find(r => r.variableId === 'VariableID:2936:65832').status = 'unresolved';
    expect(() => compileFigma(incomplete)).toThrow(/unresolved/);
  });
  it('preserves approved normalization separately from the Figma height', () => {
    const row = compileFigma(source).records.find(r => r.nodeId === '4391:92061');
    expect(row.source.height).toBe(39);
    expect(row.css.height).toBe(40);
    expect(row.decisions).toContain('User-approved minimum height 39 -> 40');
  });
  it('rejects unknown vector opacity instead of silently ignoring the field', () => {
    const incomplete = structuredClone(source);
    const wrapper = incomplete.light.children[0].children.find(c => c.type === 'INSTANCE');
    delete wrapper.children[0].children[0].properties.opacity;
    expect(() => compileFigma(incomplete)).toThrow(/opacity/);
  });
  it('rejects unsupported wrapper opacity', () => {
    const incomplete = structuredClone(source);
    incomplete.light.children[0].children.find(c => c.type === 'INSTANCE').properties.opacity = 0.4;
    expect(() => compileFigma(incomplete)).toThrow(/opacity/);
  });
  it('rejects text effects that have no implementation', () => {
    const incomplete = structuredClone(source);
    incomplete.light.children[0].children.find(c => c.type === 'TEXT').properties.effects = [{ type: 'DROP_SHADOW' }];
    expect(() => compileFigma(incomplete)).toThrow(/effects/);
  });
});
