# Реестр чистого экспорта

TableRow header: добавлена сортировка по клику с одним активным столбцом. Начально none; далее ascending/descending, при смене столбца предыдущий сбрасывается. Иконки обеих тем — свежий экспорт выбранного COMPONENT_SET 1599:48633; source/figma/table-row-header-sort.json, tokens.headerSort. Активная подпись text_primary, остальные text_secondary. Внутреннее состояние / управляемый sort, callback onSort(column, direction). Проверки и серверы не запускались по правилу пользователя.

TableRow: реализованы 16 исходных вариантов (8 dark / 8 light) композиционно из существующих компонентов; Docs / Playground / Light / Dark. Expanded и expanded  hover исключены пользователем, сохранены только в raw/definitions. Источники: source/figma/table-row-export.json и table-row-assets.json (32 SVG). Канонические токены table-rows.json; контракт docs/table-row.md. Missing remote style definition у header warning outline записан с точными paints, без выдуманного alias. Проверки не запускались по запрету пользователя. Визуальная приёмка ожидается.

Toggle: Enable обновлён для обеих тем: серая дорожка, зелёный кружок. Актуальный dark-источник SD Enterprice / UI kit, 13818:80910; свежие свойства и style IDs — source/figma/toggle-enable-update.json. Light Enable derived с соответствующими светлыми токенами. Публичные имена и порядок Controls одинаковы, danger доступен в обеих темах. Оригинальные имена сохранены в sourceVariant/variantAliases. Проверки этого изменения не запускались по запрету пользователя; результаты ниже относятся к предыдущим версиям.


Toggle: добавлены 2 разрешённых пользователем light-состояния — unactive off light и Enable light. Итого 8 исходных / 2 derived, происхождение геометрии и light token style IDs сохранено в tokens/toggles.json. Fresh palette snapshot: source/figma/toggle-light-additions.json. Визуальная приёмка новых состояний ожидается.

Проверка текущей версии 5 октября 2026: 29 unit / 37 browser tests, typecheck, lint и обе сборки прошли. ResourceTag/Badge и единая структура Storybook проверены; независимое переключение красного/зелёного Toggle подтверждено. Актуальный отчёт docs/validation.md. Долг контраста Button, ResourceTag и Badge light Count открыт; визуальная приёмка не назначена. Это заменяет прежние заметки «проверки не запускались» для текущей версии.

ResourceTag, актуализация 5 октября 2026: по просьбе пользователя icon исключён из реализации; 14 текстовых вариантов (7 dark + 7 light). Исходные данные сохранены, исключение записано в токенах. Status online/offline сохраняется.

Badge: SD Enterprice, UI kit; sets 7049:29219 (dark, 7) / 8750:115974 (light, 6). Свежие полные деревья без предупреждений, источник source/figma/badge-export.json. Контракт docs/badge.md. Тесты по указанию пользователя не запускались. Визуальная приёмка ожидается.

ResourceTag: SD Enterprice, UI kit; sets 2804:63984 (dark, 8) / 4477:82225 (light, 7). Свежие полные деревья и три SVG wrapper; источник source/figma/resource-tag-export.json. Контракт docs/resource-tag.md. Тесты по указанию пользователя не запускались. Визуальная приёмка ожидается.

IconButton: SD Enterprice, UI kit; frames 2804:63720 / 7464:29155, sets 2804:63710 / 4473:81300. 33 исходных варианта и SVG, 31 разрешённое дополнение, размеры 18/24. Все цвета через явные style ID токенов. Контракт: docs/icon-button.md. Визуальная приёмка ожидается.

Toggle: SD Enterprice, UI kit, set 700:20924; восемь вариантов, свежая полная выгрузка без предупреждений. Реализация и ограничения: docs/toggle.md. Визуальная приёмка ожидается.

Checkbox: dark frame 1855:45494, light frame 4471:70612; labelled sets 1855:45515 / 4471:70623; icon sets 1085:37057 / 4471:70649. 24 варианта и 24 SVG из свежего живого экспорта. Контракт и ограничения: docs/checkbox.md. Визуальная приёмка ожидается.

2 октября 2026: дополнительно перенесены 184 цветовых и 12 текстовых стилей SD Enterprice. Полные source style ID хранятся в source/figma/styles-export.json и src/tokens/styles.json; каталоги Tokens/Colors и Tokens/Typography. Пользовательская визуальная приёмка ожидается.

Источник подтверждён живыми list_connected_files/get_file_overview: SD Enterprice, UI kit 933:24166. Светлый фрейм выделен пользователем: 4391:92031.

| Объект | Узел | Текущий статус |
|---|---|---|
| Button light, frame | 4391:92031 | Источник светлой темы подтверждён; после исправления плагина выгружены полные варианты set |
| Button light, set | 4391:92045 | Свежая выгрузка всех 48 вариантов; реализован заново, ожидает визуальной приёмки |
| Button dark, set | 1900:44830 | Свежая выгрузка всех 49 вариантов; реализованы 48; interactive исключён контрактом |
| Иконки, wrapper | 4391:92047 / 1900:44762 | Оба SVG фактических wrapper 16×16 выгружены; path совпадает; цвета сверены с Label |

Визуальная приёмка пользователем не выполнена. Ошибка light устранена пользователем до финальной выгрузки; старые ответы не используются. Радиус 2 px, letterSpacing 1 px, layout и paint-состояния проверены по новым ответам. Во всех dark-вариантах радиусы связаны с VariableID:2936:65832; у light node boundVariables пустой, связь с переменной не приписывается.

Техническая проверка: 14 unit tests, typecheck, lint, Vite build, Storybook build и 7 браузерных тестов проходят. 96 строк source-vs-css-* сравнивают реальные состояния браузера с raw Figma source; ширина с исходным текстом/button и иконкой также совпадает. Единственное согласованное отличие исходной высоты: light danger disabled40, 39 → 40.

Контраст исходных цветов: light primary/ghost-orange, dark danger (оба размера). Полные axe-отчёты artifacts/browser/a11y-*.json; это незакрытый долг, несмотря на успешную проверку остальных требований доступности.

Недоступные поля: отдельные strokeTopWeight/strokeRightWeight/strokeBottomWeight/strokeLeftWeight не предоставлены; используются числовые uniform strokeWeight проверенных узлов. Asymmetric/mixed stroke не поддержан и не объявляется проверенным. Многорежимные/remote/extension-сценарии не представлены в этом источнике.
