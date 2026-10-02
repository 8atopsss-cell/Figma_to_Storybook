# Button pilot implementation plan

> Execution: superpowers:executing-plans, task by task in the current session.

**Goal:** перенос текстового Button из SD Enterprice в воспроизводимый Storybook.
**Architecture:** React component + CSS Modules; canonical JSON → generated CSS variables; light/dark on container.
**Tech Stack:** React, TypeScript, Vite, Storybook, Vitest, Playwright.

Контракт `docs/component-contracts.md` и три решения расхождений приняты пользователем 1 октября 2026.
IconButton — следующий этап после приёмки Button; Input/Card вне текущей очереди.

## 1. Основа

- [x] Настроить package.json, tsconfig.json, Vite, .storybook/main.ts, preview.tsx; зависимости фиксировать exact + lock.
- [x] Создать Technical story; запуск `npm run storybook`, сборка `npm run build-storybook`.
- [x] Зафиксировать AGENTS.md, README, правила дизайн-системы и реестр.

## 2. Источник и токены

- [x] Проверить активный файл и страницу; прочитать component sets и PNG.
- [x] Прочитать fills и label 32 px для всех шести оформлений и четырёх состояний обеих тем.
- [x] JSON `src/tokens/buttons.json`: исходные значения, алиасы к примитивам, sourceMap c node ID.
- [x] `scripts/generate-tokens.mjs`: генерировать `src/styles/tokens.css`; неизвестный alias завершает генерацию с ошибкой.
- [x] Локальный PT Root UI Bold с лицензией и происхождением; без сетевых запросов в браузере.

## 3. Поведение Button

- [x] Сначала `src/components/Button/Button.test.tsx` + временный Button, возвращающий null.
- [x] `npm test`: убедиться в ошибках отсутствующего button для шести тестов контракта.
- [x] Реализовать Button.tsx: нативный button, default type=button, ref/aria passthrough, decorative icon wrappers.
- [x] Button.module.css: варианты через theme tokens, min-height 32/40, wrap, fullWidth, hover/active/disabled/focus-visible.
- [x] `npm test`: шесть тестов должны пройти; `npm run typecheck`, `npm run lint`.

## 4. Каталог и проверка в браузере

- [x] Button.stories.tsx: Controls, каждое оформление, обе темы, размеры, disabled, демонстрационные иконки, длинный текст и композиция.
- [x] `src/index.ts` и отдельный пример Vite вне Storybook; `npm run build`.
- [x] Playwright: клик/Enter/Space, disabled/Tab, focus-visible, hover/active, высота 40, длинный текст и отсутствие overflow.
- [x] Axe для каждой темы, записать полный результат; не скрывать ошибки контраста ради зелёного статуса.
- [ ] PNG Figma в `artifacts/`; оригинальная иконка. PNG Storybook light/dark/focus сохранены и просмотрены; Figma PNG прочитаны через MCP, повторный экспорт завершился TIMEOUT.
- [x] Записать фактические проверки и ограничения в реестр; статус «принят» только после ответа пользователя.

## 5. Контрольная точка

- [x] README: npm ci, запуск, сборка, проверки, подключение Button и CSS.
- [x] CHANGELOG и отчёт проверок. `git diff --check`, отдельные локальные коммиты.
- [ ] Дать пользователю локальный URL Storybook и список оставшихся расхождений для приёмки Button.
