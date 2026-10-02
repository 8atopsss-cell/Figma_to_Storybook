# Чистый экспорт Button

Дополнение 3 октября 2026: пользователь поручил выделенный Toggle 700:20924. Контракт docs/toggle.md; восьми исходным вариантам соответствуют native switch и прямые Controls.

Дополнение: пользователь также поручил Checkbox из двух выделенных фреймов. Контракт: docs/checkbox.md. Это отдельный нативный input, исходные стили и состояния не наследуются от Button.

Дополнение пользователя от 2 октября 2026: также экспортируются цветовые и текстовые стили файла как самостоятельные токены; новые UI-компоненты этим не добавляются. Контракт токенов: docs/style-tokens.md.

Пользователь поручил повторный экспорт с нуля 1 октября 2026. Старые компоненты, стили, токены, stories и тесты не используются. Сохраняются явно принятые решения контракта: React + TypeScript + CSS Modules, native button, размеры 32/40 как минимальная высота, disabled нативный, hover/active/focus-visible через CSS. Нормализация danger disabled 39 → 40 и дополнительное кольцо focus-visible ранее согласованы пользователем. Цвета Figma сохраняются с отчётом о контрасте.

Уточнение пользователя от 2 октября 2026 заменяет прежнее правило переноса: весь текст всегда отображается в одну строку, без обрезки и многоточия. Кнопка расширяется под содержимое. В контейнере уже необходимой ширины возможен горизонтальный выход за его границы; fullWidth занимает ширину контейнера, но не сжимается ниже ширины содержимого.

Источник: текущий файл SD Enterprice, UI kit. Пользователь выделил светлый фрейм 4391:92031; в нём set 4391:92045. Dark set 1900:44830 проверяется независимо. Экспортируются шесть согласованных оформлений; единичный dark interactive исключён по принятому контракту. IconButton, Input и Card вне задачи.

API: variant, size, children, startIcon/endIcon, disabled, fullWidth и нативные атрибуты/ref. Default type button. Схемы и defaults берутся из свежих componentPropertyDefinitions; состояния Figma показываются в справочном каталоге исходников, а действия компонента используют реальные псевдоклассы.

Техническая проверка не назначает визуальную приёмку. Неполные темы не отображаются как реализованные.

Переход фона, заданный пользователем 2 октября 2026: background-color, cubic-bezier(0.656, 0.003, 0.355, 1); наведение и возврат — 300ms, вход в active при нажатии — 70ms. Отпускание возвращает обычную длительность 300ms. Применяется ко всем вариантам и обеим темам; конечные цвета Figma сохраняются. При prefers-reduced-motion: reduce переход отключается, включая active. Эти параметры заданы пользователем, не получены из Figma.
# IconButton extension

User-authorized mini/icon buttons: see docs/icon-button.md. Native button, required accessible name; primary/tertiary/ghost, 18/24, high/low ghost contrast. Keep 33 original variants; identify 31 missing state/size additions. Palette aliases must use explicit Figma style IDs exclusively. Native hover/active/disabled and Button motion timings apply.
