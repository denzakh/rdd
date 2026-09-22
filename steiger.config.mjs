import { defineConfig } from 'steiger'
import fsd from '@feature-sliced/steiger-plugin'

/**
 * FSD-конфиг (docs/spec-stage-4.md §4, CI).
 *
 * `insignificant-slice` выключен для feature/entity/widget слайсов: их
 * единственные потребители — страницы в `app/`, который лежит в корне репо
 * и не входит в анализ (`steiger src`). Смотри `README.md` → «Стек».
 */
export default defineConfig([
  ...fsd.configs.recommended,
  {
    files: [
      './src/features/**',
      './src/entities/**',
      './src/widgets/matrix/**',
      './src/widgets/landing/**',
      './src/widgets/home-hub/**',
      './src/widgets/site-header/**',
    ],
    rules: {
      'fsd/insignificant-slice': 'off',
    },
  },
  {
    // Клиентский виджет не может импортировать баррель @/shared/api: он тянет
    // серверный session-server (next/headers) в клиентское дерево (ошибка сборки).
    // applyComputed — чистая функция, импорт напрямую из листа безопасен.
    files: ['./src/widgets/matrix/ui/matrix-grid.tsx'],
    rules: {
      'fsd/no-public-api-sidestep': 'off',
    },
  },
])
