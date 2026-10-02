# Clean Button Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for sequential implementation. This experiment uses a fresh project and fresh Figma data.

**Goal:** Export Button to React/Storybook from fresh Figma specification without using the existing implementation.

**Architecture:** Fresh sibling project E:/Codex/Figma_to_Storybook-clean. Store raw node trees and variable graphs, derive provenance-bearing canonical tokens, generate CSS, implement a native Button and independent Storybook stories. A source error blocks only the affected theme.

**Tech Stack:** React, TypeScript, CSS Modules, Vite, Storybook, Vitest, Playwright.

- [x] Save fresh paginated node trees to source/figma and verify all descendants; collect schemas, variables and SVG wrapper exports.
- [x] Create independent package/configuration; write behavior tests for native button, form default, disabled, decorative icons and ref; run npm test against a null component and confirm failures.
- [x] Implement scripts/compile-figma.mjs; validate completeness before producing src/tokens/buttons.json. Preserve four radii, paint visibility/opacity, native token resolution, typography and original IDs. Test that missing properties cause explicit errors.
- [x] Implement scripts/generate-tokens.mjs and Button.tsx/Button.module.css; run npm run tokens and npm test. CSS state selectors use hover/active/disabled, outlines preserve INSIDE strokes without shifting layout.
- [x] Create Storybook playground/catalogue and a Vite consumer. Download the Figma-selected font afresh with license; export the actual icon. Start separate Storybook on port 6007.
- [x] Run npm run typecheck, npm run lint, npm run build and npm run build-storybook. Browser checks compare all exported states against fresh Figma values, test real keyboard/mouse behavior and record complete axe reports.
- [x] Save source-vs-CSS comparison and screenshots; report blocked data and contrast debt. Leave visual acceptance to user.
