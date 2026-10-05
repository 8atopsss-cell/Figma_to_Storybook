# Проверка чистого экспорта

Уточнение от 2 октября 2026: прежняя проверка переноса длинного текста ниже описывает историческое поведение. Актуальный контракт — весь текст в одну строку без обрезки; кнопка расширяется под содержимое. Браузерная проверка длинного текста обновлена под это требование.

Дата: 1 октября 2026. Проект E:/Codex/Figma_to_Storybook-clean, ветка experiment/button-clean.

## Источник и полнота

- Подключённый активный файл SD Enterprice проверен через list_connected_files и get_file_overview. UI kit 933:24166; пользователь выделил светлый frame 4391:92031.
- После исправления плагина получены полные деревья light set 4391:92045 (48 вариантов) и dark set 1900:44830 (49), depth 4, страницы по 10 детей. Суммарные ID и childCount совпадают. Предупреждения о пропущенных корневых страницах закрыты объединением всех страниц; внутри компонентов нет depth/node truncation.
- Raw trees, свойства слоёв, mixed text segments, схемы/источники схем и variable graphs сохранены в source/figma/fresh-export.json. 96 состояний перенесены; единичный dark interactive исключён ранее принятым контрактом.
- Радиус четырёх углов 2 px, cornerSmoothing 0. Dark связывает углы с VariableID:2936:65832, corner radius/s_corner (2), mode 2865:0; native resolution совпадает. У light привязок нет, числовые радиусы сохранены как числовые. Локальные CSS aliases не выдаются за переменные Figma.
- Typography: PT Root UI Bold 700, 14/18, letterSpacing 1 px, UPPER, CASE true и LIGA false. Paints сохраняют color/opacity/visibility; скрытые strokes не становятся видимыми границами.
- SVG получены из настоящих wrapper light/dark (4391:92047, 1900:44762). Геометрия path совпадает. currentColor используется после сверки видимого вектора с цветом Label в каждом варианте. Предупреждения VECTOR закрыты экспортом wrapper, не скриншотной реконструкцией.
- Файл шрифта скачан заново из https://github.com/font-archive/PT-Root-UI, Bold/PT Root UI Bold_Web.zip; OFL из того же архива сохранён рядом. SHA256 WOFF2: 693e90307dd7452ccf3992607ca514a2286c7c10d0c7b714361f2eed3eae743d.

## Проверки

- TDD поведения: шесть тестов сначала упали на null-компоненте, затем прошли после новой реализации.
- TDD экспорта: пять тестов сначала упали на неготовом экспортере. Проверяют отсутствие радиусов, обрезанный subtree, unresolved binding, provenance радиуса и отдельную запись согласованной нормализации. Все проходят.
- npm test: 14 passed. npm run typecheck и npm run lint: успешно.
- npm run build и npm run build-storybook: успешно. Storybook предупреждает о размере vendor chunks; это не ошибка сборки.
- npm run test:browser: 8 passed. Реальные hover и pointer-down active, все 96 состояний сравниваются с raw Figma. Проверены четыре радиуса, реальные fills/Label, padding/gap, типографика, opacity, видимость/толщина INSIDE strokes, высота и ширина при исходном тексте и иконке.
- Сохранены source-vs-css-light.json и source-vs-css-dark.json (48 строк каждый), PNG каталогов light/dark и focus.
- Enter/Space активируют Button, Tab даёт видимый focus и пропускает disabled; disabled не вызывает действие. Длинный текст переносится в 160px без горизонтального переполнения; fullWidth занимает контейнер.
- Публичный компонент отдельно импортирован в Vite consumer и проверен в браузере.
- Исходные PNG light-primary/dark-primary/light-tertiary экспортированы заново, соответствующие браузерные PNG сохранены и просмотрены. Это визуальная проверка, не назначение приёмки.

## Принятые отличия и ограничения

- По ранее принятому решению light danger disabled40 использует minimum height40 при исходной height39. Свежий dark вариант уже имеет height40.
- Focus-visible с 2px внешним кольцом и 2px промежутком — ранее принятая добавка для клавиатуры, а не состояние Figma.
- Контраст в оригинальной палитре остаётся недостаточным: light primary/ghost-orange (4 узла) и dark danger (2 узла). Цвета не изменены. Полные a11y-light.json/a11y-dark.json содержат все результаты axe; остальные обнаруженные категории не дают нарушений. Hover/active контраст отдельным axe-аудитом не проверялся.
- Сериализатор не предоставляет отдельные stroke*Weight для каждой стороны. Использованы числовые uniform strokeWeight проверенных узлов; перенос асимметричных/mixed strokes этим экспортером не поддерживается.
- Коллекции этого файла имеют один режим; реальные многорежимные/remote/extension-цепочки не проверены. Эффективный контекст и raw graph сохраняются.
- Экспортер ограничен подтверждённым типом Button. Неподдерживаемые эффекты, layout или недостающие свойства вызывают явную ошибку; это не универсальный Figma-to-CSS транслятор.
- Визуальная приёмка: ожидает решения пользователя.

## Ревью

Независимое ревью по superpowers:requesting-code-review обнаружило два замечания: неполные guards effects/opacity вложенных слоёв и глобальный reset в публичном импорте. Оба случая воспроизведены failing tests, затем исправлены. Повторное ревью подтвердило устранение; новых важных замечаний не найдено. Проверки 14/8 и сборки повторно пройдены после исправлений.
# IconButton validation — 2026-10-03

29 unit tests pass; typecheck, lint, Vite build and Storybook build pass. Existing 28 browser tests pass. All three new IconButton browser tests pass after correcting asset checks for Vite data URLs and waiting for the story before Tab. Checks cover all 64 combinations, geometry, explicit token colors, loaded SVG masks, native hover/active durations, focus and reduced motion. New axe reports a11y-icon-button-light/dark.json have zero violations; existing Button contrast debt remains light 4 / dark 2. Original source differences and 31 additions are documented in docs/icon-button.md. Screenshots inspected; user visual acceptance pending.
# Проверка 5 октября 2026

После добавления двух light Toggle: 31/31 unit tests, typecheck, lint и обе сборки успешны; целевой браузерный прогон Toggle 14/14, axe light/dark без нарушений. Палитра получена через актуальные light CSS tokens по style ID; 2 новых состояния отмечены derived. Полный браузерный прогон ниже относится к версии до light-дополнений. Новая визуальная приёмка не назначена.

Текущая версия в E:/Codex/Figma_to_Storybook: npm test — 29/29; npm run typecheck и npm run lint — без ошибок; npm run build и npm run build-storybook — успешны. Полный npm run test:browser — 37/37. git diff --check — без ошибок. Storybook сообщает предупреждение о размере vendor chunks, сборка успешна.

Браузер подтверждает структуру Docs / Playground / Light / Dark для всех шести компонентов и переключение общей темы для ResourceTag, Badge и Toggle. Красный и зелёный Toggle в Dark переключаются независимо через disable и возвращаются к собственному оформлению. Сверены геометрия 14 ResourceTag и 13 Badge, online/offline, CENTER strokes Badge; прежние проверки Button/Checkbox/IconButton/Toggle и токенов сохранены.

Во время проверки исправлены: тест длинной кнопки передавал кириллицу через URL args, которую Storybook не применял (тест теперь использует ASCII); исходная строка счётчика Badge сохраняет подтверждённую ширину текстового слоя 20 px, без которой браузерный счётчик был 26.77 px вместо 28 px.

Контрастный долг открыт. Полные свежие axe-отчёты: Button light — 4 узла, dark — 2; ResourceTag light — 14 узлов, dark — 6 (включая повторения online/offline); Badge light — 1 (Count), dark — 0. Checkbox, IconButton и Toggle — без зарегистрированных axe-нарушений в этих каталогах. Тесты сохраняют отчёты, допускают color-contrast и требуют отсутствия других нарушений; 37/37 не означает прохождение всей доступности. Исходные цвета Figma не менялись. Скриншоты и отчёты находятся в artifacts/browser. Визуальную приёмку назначает только пользователь.
