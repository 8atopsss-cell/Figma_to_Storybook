# Токены стилей Figma

Источник: живой SD Enterprice / UI kit, get_local_styles от 2 октября 2026. Raw ответ сохранён в source/figma/styles-export.json вместе с именами, style ID, paint properties и исходными единицами типографики.

184 цвета и 12 текстовых стилей экспортированы в src/tokens/styles.json. npm run tokens воспроизводимо генерирует JSON и src/styles/figma-styles.css. Styles не заменяют Variables: boundVariables у этих цветов пусты, алиасы между совпадающими цветами не создаются. Light/dark определяется по исходным путям стилей, не по modes коллекций. Палитры представлены собственными полными именами CSS variables, например --figma-color-light-theme-text-light-text-primary.

Публичный импорт figmaStyleTokens из src/index.ts также подключает CSS и три начертания PT Root UI. Можно использовать цветовую переменную через var(...), а типографику — через класс figma-text-h1 или отдельные переменные --figma-text-h1-font-size и другие.

В Storybook: Tokens/Colors — все цвета, поиск и фильтр all/shared/light/dark; прозрачные цвета показаны на шахматном фоне. Tokens/Typography — 12 стилей, редактируемый текст, примеры двух абзацев и исходные параметры. Общий переключатель темы Storybook меняет фон просмотра.

Типографика сохраняет font family/style, размер, line height, letter spacing, text case/decoration, paragraph indent/spacing и list spacing. Проценты line height и letter spacing переводятся в em; исходные числа не округляются в JSON. Начертания Regular/Medium/Bold отображаются файлами WOFF2 с OFL; происхождение и SHA256 в src/assets/fonts/README.md.

Ограничения: инструмент не возвращает openTypeFeatures текстовых стилей — поле помечено unavailable, признаки CASE/LIGA из отдельного Button не приписываются всем стилям. paragraph/list spacing реализованы для вложенных p/li, не являются универсальным переносом Figma rich text. Effects (8 стилей) сохранены в raw ответе, но не включены в цветовые/текстовые токены. Текущие Button-токены и их mapping остаются независимым экспортом узлов, а не автоматически перепривязываются к стилям по совпадению цветов.

Проверки: тесты генератора защищают сохранность ID/единиц/прозрачности и отклоняют пропущенные значения, коллизии имён и unresolved bindings. Браузерные тесты сравнивают все 184 цвета и все 12 наборов метрик со свежей выгрузкой. Визуальную приёмку назначает пользователь; прежний долг контраста Button остаётся.

Результат проверки 2 октября 2026: 18 unit-тестов и 11 браузерных тестов, typecheck, lint, Vite build и Storybook build проходят. Проверены фильтры цветов и редактирование текста через Controls. Цветовые CSS variables сохраняют raw alpha; computed color Chromium может округлять alpha в пределах одного шага 1/255. Скриншоты каталогов: artifacts/browser/style-colors.png и style-typography.png.
