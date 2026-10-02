# Правила чистого экспорта

- Toggle: source/figma/toggle-export.json → src/tokens/toggles.json и toggle-tokens.css через npm run tokens. Все восемь schema variantOptions сохраняются; отсутствующие сочетания не добавляются. Контракт docs/toggle.md.

- Checkbox: source/figma/checkbox-export.json → src/tokens/checkboxes.json и checkbox-tokens.css через npm run tokens. Контракт docs/checkbox.md; сохранять независимые labelled/icon источники, нативную семантику и оригинальные SVG.

- Только свежие MCP ответы этой попытки; предыдущая реализация не служит источником.
- Канонические токены src/tokens/buttons.json; команда npm run tokens генерирует CSS.
- Канонические токены локальных стилей: src/tokens/styles.json из source/figma/styles-export.json. Та же команда генерирует figma-styles.css; не редактировать generated CSS вручную. Инструкции: docs/style-tokens.md.
- Каждый токен хранит source file, node ID, исходные поля и ссылки на свежую выгрузку.
- Node bindings, коллекции, modes, raw valuesByMode и native consumer resolution сохраняются отдельно от локальных CSS aliases.
- Отсутствие свойства не заменяется нулём. Обрезанное дерево дополняется запросами. Неизвестный существенный параметр блокирует только зависимую часть.
- SVG берётся из фактического экземпляра/его wrapper. Преобразование цвета в currentColor допустимо только после сверки цветов в исходных вариантах.
- Семантический button; hover, active, focus-visible и disabled действуют в браузере.
- Текст кнопки всегда в одну строку, полностью видим; кнопка не сжимается ниже ширины содержимого, включая fullWidth. Правило пользователя от 2 октября 2026 заменяет перенос длинного текста.
- npm test, npm run typecheck, npm run lint, npm run build, npm run build-storybook, npm run test:browser.
- Полные a11y-отчёты сохраняются в artifacts/browser. Долг контраста не исчезает после успешного теста.
# IconButton additions

Mini/icon buttons are explicitly authorized. See docs/icon-button.md: existing variants retain native geometry/assets; missing states use Button style IDs, missing sizes use documented scaling. No guessed colors or color-match aliases. All additions are tagged derived; visual acceptance remains with user.
