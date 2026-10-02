# Состав репозитория

Перенос на GitHub: 2 октября 2026.

- Корень — новый чистый экспорт Button из E:/Codex/Figma_to_Storybook-clean: компоненты, токены, SVG/font assets, свежая Figma-выгрузка, Storybook, тесты, документация и browser-отчёты.
- archive/button-pilot — полный набор Git-файлов и новых документов прежнего E:/Codex/Figma_to_Storybook, включая первоначальный план и проверки MCP. Архив сохраняется для истории, но не включён в текущие build/test/lint/Storybook.
- node_modules, .git, cache, логи, dist, storybook-static и временные test-results не копируются в публикуемый набор. Зависимости воспроизводятся через npm ci; сборки — командами из README.

При создании чистого Button архивные стили и токены не использовались.
