# Правила чистого экспорта

- Только свежие MCP ответы этой попытки; предыдущая реализация не служит источником.
- Канонические токены src/tokens/buttons.json; команда npm run tokens генерирует CSS.
- Каждый токен хранит source file, node ID, исходные поля и ссылки на свежую выгрузку.
- Node bindings, коллекции, modes, raw valuesByMode и native consumer resolution сохраняются отдельно от локальных CSS aliases.
- Отсутствие свойства не заменяется нулём. Обрезанное дерево дополняется запросами. Неизвестный существенный параметр блокирует только зависимую часть.
- SVG берётся из фактического экземпляра/его wrapper. Преобразование цвета в currentColor допустимо только после сверки цветов в исходных вариантах.
- Семантический button; hover, active, focus-visible и disabled действуют в браузере.
- npm test, npm run typecheck, npm run lint, npm run build, npm run build-storybook, npm run test:browser.
- Полные a11y-отчёты сохраняются в artifacts/browser. Долг контраста не исчезает после успешного теста.
