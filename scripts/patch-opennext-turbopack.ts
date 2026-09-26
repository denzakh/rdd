/**
 * Патч OpenNext для Windows: инлайнит Turbopack-чанки в worker bundle.
 *
 * Зачем (баг opennextjs/opennextjs-cloudflare#1305, не исправлен и в 1.20.6):
 * плагин `patches/plugins/turbopack.js` фильтрует traced-файлы строкой
 * `file.includes(".next/server/chunks/")` и переписывает путь через
 * `chunk.replace(/.*\/\.next\//, "")`. Оба ожидают POSIX-слеши, а на Windows
 * traced-файлы приходят с обратными. Итог: switch в requireChunk() пустой,
 * любой маршрут падает с `ChunkLoadError` → `ComponentMod.handler is not a function`
 * (HTTP 500 на всех страницах). На Linux/CI баг не воспроизводится.
 *
 * Что делаем: нормализуем разделители в tracedFiles перед генерацией свитча.
 * Скрипт идемпотентен (помечает файл маркером) и ничего не ломает на POSIX —
 * там `replace(/\\/g, "/")` просто не находит обратных слешей.
 *
 * Запуск: автоматически через `postinstall` (см. package.json) либо вручную
 * `npx tsx scripts/patch-opennext-turbopack.ts`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const MARKER = '/* rdd:patch:win-traced-files */'
const REL_TARGET = join('dist', 'cli', 'build', 'patches', 'plugins', 'turbopack.js')

/** Что вставляем: нормализация путей traced-файлов (решение из issue #1305). */
const OLD = `            patchCode: async ({ code, tracedFiles }) => {
                let patched = patchCode(code, inlineExternalImportRule);`
const NEW = `            patchCode: async ({ code, tracedFiles }) => {
                ${MARKER}
                // Windows: traced-файлы приходят с обратными слешами, а фильтры
                // ниже ожидают POSIX-пути → без нормализации switch выходит пустым.
                tracedFiles = tracedFiles.map((f) => f.replace(/\\\\/g, "/"));
                let patched = patchCode(code, inlineExternalImportRule);`

function main(): void {
  let target: string
  try {
    // The package's "exports" map does not expose internal dist/ paths,
    // so require.resolve() cannot find them — go through node_modules directly.
    target = resolve(projectRoot, 'node_modules', '@opennextjs', 'cloudflare', REL_TARGET)
  } catch {
    console.log('ℹ️  @opennextjs/cloudflare не установлен — патч не нужен.')
    return
  }
  if (!existsSync(target)) {
    console.log(`ℹ️  Файл плагина не найден (${target}) — пропускаем.`)
    return
  }

  const src = readFileSync(target, 'utf8')
  if (src.includes(MARKER)) {
    console.log('ℹ️  Патч OpenNext (Windows) уже применён.')
    return
  }
  if (!src.includes(OLD)) {
    console.warn(
      '⚠️  Плагин OpenNext изменился — патч Windows не применён автоматически.\n' +
        '    Проверьте, что requireChunk() в [turbopack]_runtime.js содержит чанки.'
    )
    return
  }

  writeFileSync(target, src.replace(OLD, NEW), 'utf8')
  console.log('✅ Патч OpenNext (Windows, traced-файлы) применён.')
}

main()
