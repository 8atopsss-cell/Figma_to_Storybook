# Правила чистого экспорта

- TableRow hover: CSS :hover действует для active, new, delited, blocked, selected и hover обеих тем; header и action bar исключены по решению пользователя. Фон брать из исходного hover той же темы. Менять только фон, сохранять данные и независимые состояния Checkbox/Toggle. Политику и исключения записывать как решение пользователя, не выдавать за отдельные варианты Figma.

- TableRow Toggle: по решению пользователя — Enable danger в обеих темах по умолчанию; off/on сохраняет danger. Исходные unactive остаются недоступными. Правило относится к композиции строки; общий Toggle и исходные Figma variants не переопределять.

- TableRow: собирать композиционно из Checkbox, Toggle, IconButton, ResourceTag и Button. Сохранять 8 вариантов каждой темы; expanded и expanded  hover исключены пользователем. Исходные definitions не фильтровать, публичные variants и generated CSS фильтровать. Канонические токены table-rows.json генерировать из table-row-export.json и table-row-assets.json; реальные SVG и style IDs сохранять. Навигация Docs / Playground / Light / Dark. Контракт docs/table-row.md.

- Toggle: одинаковые имена и порядок Controls обеих тем: disable / Enable / Enable danger / unactive on / unactive off. Enable — зелёный кружок на серой дорожке (актуальный источник 13818:80910, source/figma/toggle-enable-update.json); Enable danger — красный кружок. Общий prop danger работает в обеих темах; success не используется. Публичные переименования сохранять как variantAliases/sourceVariant, оригинальную Figma-схему не менять. Светлый Enable использует актуальную dark-геометрию и соответствующие light style ID по запросу пользователя.


- Toggle: пользователь разрешил light unactive off и success-on как аналоги dark. 8 исходных + 2 derived; сохранить оригинальную Figma-схему, расширить только API/Controls. Геометрия из соответствующих dark nodes, палитра по light style IDs токенов. У исходного красного и добавленного зелёного режимов независимый возврат после off. Это заменяет прежний запрет light disabled-off; не создавать прочие отсутствующие сочетания без запроса.

- Единая навигация применена к Button, IconButton, Checkbox, Toggle, ResourceTag и Badge: только Docs / Playground / Light / Dark. При различии схем тем Playground показывает только соответствующий выбранной теме variant Control; сохраняет независимый выбор light/dark и не создаёт отсутствующие сочетания (например, Badge light xs, Toggle light disabled-off/danger). Группы и skeleton Checkbox находятся внутри Light/Dark. Ссылки существующих браузерных сценариев переводить на Playground с args или каталоги; старые отдельные истории не восстанавливать ради тестов.

- Структура Storybook для компонентов: Docs через autodocs; один Playground с Controls и переключением light/dark в общей панели темы; отдельные Light и Dark как полные наборы вариантов своей фиксированной темы. Не создавать DarkPlayground и отдельные истории состояний, которые уже доступны в Controls, без запроса пользователя. Тема самого компонента и фона должны совпадать: явный theme компонента получать из context.parameters.theme ?? context.globals.theme, а не фиксировать light в args Playground. В наборах при необходимости показывать поддержанные состояния рядом с вариантом; неподтверждённые сочетания не добавлять.

- Актуальное решение ResourceTag: icon исключён пользователем; экспортировать только 14 текстовых вариантов. Сохранить оригинальную схему в raw/definitions, использовать отфильтрованные tokens.variants для Controls. Это заменяет прежнее требование переноса всех 15 вариантов.

- Badge: source/figma/badge-export.json → src/tokens/badges.json и badge-tokens.css через npm run tokens. Сохранить 13 исходных вариантов, регистр count/Count, CENTER/OUTSIDE stroke и HUG счётчика. Не добавлять light xs. Контракт docs/badge.md.

- ResourceTag: source/figma/resource-tag-export.json → src/tokens/resource-tags.json и resource-tag-tokens.css через npm run tokens. Только 14 текстовых вариантов; исходные схемы сохранены, icon исключён пользователем. Не добавлять status для несвязанных слоёв и интерактивное поведение. Контракт docs/resource-tag.md.

- Toggle: source/figma/toggle-export.json → src/tokens/toggles.json и toggle-tokens.css через npm run tokens. Все восемь schema variantOptions сохраняются в исходной схеме; два согласованных light-дополнения отмечаются derived и входят в расширенный список Controls. Палитра через style ID из src/tokens/styles.json. Контракт docs/toggle.md.

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
