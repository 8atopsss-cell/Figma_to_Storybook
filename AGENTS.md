# Clean export instructions

- Read docs/component-contracts.md, docs/component-registry.md and docs/design-system-rules.md before changes.
- User requested a fresh implementation; never use archive/button-pilot Button, CSS, tokens, stories or tests as the source specification.
- React + TypeScript + CSS Modules; Button, IconButton, Checkbox, Toggle and local color/text style tokens. Other UI components remain out of scope.
- Canonical src/tokens/buttons.json; npm run tokens derives it from fresh raw Figma and generates CSS.
- Local style tokens: source/figma/styles-export.json -> src/tokens/styles.json and src/styles/figma-styles.css via the same tokens command. Read docs/style-tokens.md; preserve source IDs/units/opacity, never infer aliases from matching colors.
- Preserve source IDs, fields, schemas, variable bindings/collections/modes and native resolutions.
- Missing, mixed, truncated and zero values are distinct. Never guess missing visual values from PNG.
- SVG and font assets have recorded sources. Screenshot comparisons supplement parameter checks.
- Run npm test, typecheck, lint, build, build-storybook and test:browser. Inspect artifacts/browser/a11y-*.json; contrast debt remains until explicitly resolved.
- Only user can assign visual acceptance.
