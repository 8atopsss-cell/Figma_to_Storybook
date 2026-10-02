# Button — чистый экспорт из Figma

Также перенесены цветовые и текстовые стили SD Enterprice: 184 цвета, 12 стилей типографики. Каталоги Storybook: Tokens/Colors и Tokens/Typography. Генерация: npm.cmd run tokens. Подробности и примеры использования: docs/style-tokens.md.

Свежий экспорт SD Enterprice / UI kit: Button light 4391:92045 и dark 1900:44830. Создан в отдельном проекте по просьбе пользователя 1 октября 2026.

Старая реализация, её токены, CSS, stories и тесты не использовались при создании нового Button. Сохранены ранее согласованные требования к поведению. Версии инструментов зафиксированы в package-lock.json.

Новый чистый экспорт размещён в корне репозитория. Все файлы прежнего пилота, включая планы и отчёты проверок плагина, сохранены в archive/button-pilot как история эксперимента. Архив не входит в тесты, сборку и stories нового проекта.

Установка после клонирования:

```powershell
npm.cmd ci
```

node_modules, временные логи и результаты сборки в Git не входят.

Запуск из этой папки:

```powershell
npm.cmd run tokens
npm.cmd run storybook
```

Storybook: http://127.0.0.1:6007/?path=/story/figma-export-button--light

Тёмная тема: http://127.0.0.1:6007/?path=/story/figma-export-button--dark

Playground содержит реальные действия/Controls. Source Mapping показывает исходные node ID. Vite consumer: npm.cmd run dev, http://127.0.0.1:5174.

Источник токенов: source/figma/fresh-export.json. npm run tokens проверяет полноту, создаёт канонический src/tokens/buttons.json и генерирует src/styles/tokens.css, API и SVG-компонент. Не редактировать generated CSS вручную. Raw variable graphs сохраняют коллекции, modes, valuesByMode и native resolution.

Публичный импорт: Button / AddIcon из src/index.ts; обернуть потребителя контейнером data-theme="light" либо data-theme="dark".

```tsx
<div data-theme="light">
  <Button startIcon={<AddIcon />} onClick={save}>Сохранить</Button>
</div>
```

Проверки: npm.cmd test, npm.cmd run typecheck, npm.cmd run lint, npm.cmd run build, npm.cmd run build-storybook, npm.cmd run test:browser. Для браузерной проверки должны работать Storybook 6007 и Vite 5174.

Подробный отчёт: docs/validation.md. Внешний вид ещё не принят пользователем.
