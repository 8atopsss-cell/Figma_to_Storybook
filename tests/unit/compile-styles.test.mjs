import fs from 'node:fs';
import { describe, it, expect } from 'vitest';
import { compileStyles } from '../../scripts/compile-styles.mjs';
const source = JSON.parse(fs.readFileSync('source/figma/styles-export.json', 'utf8'));
describe('local Figma style export', () => {
  it('preserves every style ID, transparency and source units', () => {
    const tokens = compileStyles(source);
    expect(tokens.colors.map(token => token.id)).toEqual(source.paints.map(style => style.id));
    expect(tokens.typography.map(token => token.id)).toEqual(source.texts.map(style => style.id));
    const overlay = tokens.colors.find(token => token.name === 'light theme/background/light_overlay');
    expect(overlay.alpha).toBe(source.paints.find(style => style.id === overlay.id).paints[0].opacity);
    const h3 = tokens.typography.find(token => token.name === 'H3');
    expect(h3.raw.properties.letterSpacing).toEqual({ unit: 'PERCENT', value: 1 });
    expect(h3.css['letter-spacing']).toBe('0.01em');
  });
  it('rejects missing opacity rather than inventing opaque paint', () => {
    const broken = structuredClone(source);
    delete broken.paints[0].paints[0].opacity;
    expect(() => compileStyles(broken)).toThrow('opacity');
  });
  it('rejects CSS name collisions instead of silently overwriting tokens', () => {
    const broken = structuredClone(source);
    broken.paints[0].name = 'sample/a b';
    broken.paints[1].name = 'sample/a-b';
    expect(() => compileStyles(broken)).toThrow('Duplicate CSS token name');
  });
  it('rejects unresolved variable bindings and missing text metrics', () => {
    const broken = structuredClone(source);
    broken.paints[0].paints[0].boundVariables = { color: { id: 'unresolved' } };
    expect(() => compileStyles(broken)).toThrow('Variable resolution required');
    const missing = structuredClone(source);
    delete missing.texts[0].properties.lineHeight;
    expect(() => compileStyles(missing)).toThrow('lineHeight');
  });
});
