# IconButton

Свежий источник: SD Enterprice, UI kit 933:24166. Выделенные фреймы: dark 2804:63720, light 7464:29155. Sets: dark 2804:63710 (14 вариантов), light 4473:81300 (19 вариантов). Полные поля, схемы и исходные SVG: source/figma/icon-button-export.json. На узлах нет привязанных переменных; цветовые style ID сохранены. SVG выгружены из фактических glyph/wrapper, 33 оригинала с SHA-256 в canonical manifest.

API: IconButton, variant primary / tertiary / ghost, size 18 / 24, contrast high / low для ghost, disabled, icon (ReactNode), обязательный aria-label, native button props/ref. По умолчанию type=button. SVG-маски сохраняют исходные контуры; цвет берётся из CSS токенов через явные style ID. Пользовательская иконка должна использовать currentColor. Поддерживаются клавиатура, focus-visible и reduced-motion.

64 комбинации: 33 исходные, 31 дополненная по прямому разрешению пользователя. Исходный dark set не имеет свойства size; наблюдаемый размер 18 записан как геометрия, схема не подменена. Отсутствующие hover/disable у tertiary получают палитру соответствующего Button 32 через его style ID, сохраняя мини-геометрию. Остальные отсутствующие 24 px состояния берут палитру соответствующего 18 px варианта. Если есть enabled 24 px, сохраняются его геометрия и glyph во всех добавленных состояниях; иначе геометрия 18 px масштабируется 4/3, радиус и stroke остаются прежними.

Все цвета — var(--figma-color-...), через ID, без поиска совпадающих HEX и новых цветов. Пустой paint означает transparent. Канонический style имеет приоритет над сохранённым raw paint узла. В source сохранены оба; aliases в src/tokens/icon-buttons.json перечисляют raw paint и значение токена. Фокус использует существующий --focus-accent из Button.

Существующие отличия сохранены: у light primary/tertiary 18 px внутренний rectangle 16×16, у dark фон 18×18; light primary 24 px использует крест вместо треугольника; ghost high 24 px имеет крест в enabled/hover/active и исходную иконку карандаша в disable с wrapper 22.782754898 px. Исходные иконки не унифицированы по догадке. Для единой пользовательской иконки есть prop icon и CustomIcon story.

Анимация фона соответствует Button: hover/release 300 ms, active 70 ms, cubic-bezier(0.656, 0.003, 0.355, 1). Нет transition-delay. Reduced motion отключает transition. Light/Dark каталоги фиксируют все состояния для сравнения; Playground использует реальные hover/active/disabled. SourceMapping отделяет Figma от дополнений.

Pipeline: source/figma/icon-button-export.json + исходные Button style ID + src/tokens/styles.json → scripts/generate-icon-button-tokens.mjs → src/tokens/icon-buttons.json, src/styles/icon-button-tokens.css, src/assets/icon-buttons/*.svg. Включён в npm run tokens. Визуальная приёмка — только пользователем. Существующий долг контраста Button не закрывается этим переносом.
