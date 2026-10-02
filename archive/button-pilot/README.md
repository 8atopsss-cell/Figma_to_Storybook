# Figma → Storybook: кнопки

Источник: SD Enterprice / UI kit. Первая контрольная точка — текстовый Button;
IconButton следует после его приёмки. Реализация: React + TypeScript + CSS Modules,
Vite и Storybook. Версии закреплены package-lock.json.

## Запуск в Windows

Node.js 24 использован при проверке.

```powershell
npm.cmd ci
npm.cmd run storybook
```

Storybook: http://127.0.0.1:6006/?path=/story/components-button--light-catalogue
В каталоге доступны Controls, документация, Accessibility и переключение темы.
Hover/active/focus проверяются наведением, нажатием и Tab.

Пример использования вне Storybook: `npm.cmd run dev`, http://127.0.0.1:5173.

## Проверки

```powershell
npm.cmd run tokens
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run build-storybook
npx.cmd playwright install chromium
npm.cmd run test:browser
```

Playwright запускает Storybook и Vite автоматически, использует Chromium из своей
поставки. Повторный запуск использует уже работающие локальные серверы.
PNG и полные отчёты доступности сохраняются в artifacts/browser/.
Ошибки контраста сохраняются в отчётах; зелёный тест поведения не означает
полную проверку WCAG. Остальные проверяемые ошибки доступности приводят к падению теста.

## Подключение

```tsx
import { Button } from './src';
import './src/styles/global.css';

<div data-theme="dark">
  <Button variant="secondary" size={40} onClick={save}>Сохранить</Button>
</div>
```

Поставка сейчас — исходники, не опубликованный npm-пакет.
Контракт: docs/component-contracts.md. Реестр: docs/component-registry.md.
Исходные цвета и ссылки на узлы: src/tokens/buttons.json, поле sourceMap.
CSS токенов генерируется; вручную его не изменять.

## Приёмка и ограничения

- Шесть оформлений; 32/40 px; light/dark; disabled, декоративные иконки, fullWidth,
  перенос текста и нативная клавиатура. Default type=button не отправляет форму.
- Расхождения ghost-orange и высоты danger разрешены контрактом; добавлен focus-visible.
- Цвета дизайна имеют ошибки контраста. Они сохраняются до отдельного решения дизайнера.
- Иконка + в stories пока демонстрационная: оригинал не удалось экспортировать из Figma.
- Радиус, граница и некоторые параметры текста восстановлены визуально; локальный
  MCP не предоставил точные свойства. Полное совпадение с Figma ещё не принято.
- PT Root UI Bold подключён локально с лицензией; происхождение в src/assets/fonts/README.md.
- GitHub-репозиторий, публикация и интеграция в продукт не выполнялись.

Документация настройки: [React/Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite),
[interaction tests](https://storybook.js.org/docs/writing-tests/interaction-testing).
