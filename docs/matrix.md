# Спецификация для AI-агента: Разработка виджета «Матрица» (MatrixGrid)

**Цель:** Создание высокопроизводительного, виртуализированного компонента таблицы для отображения и ввода большого числа клинических признаков по динамическим временным точкам (фазам) заболевания.

**Стек:** Next.js 16 (App Router), React 19, TypeScript (Strict), Tailwind CSS, `@tanstack/react-virtual`, `zustand` (оба пакета установлены в `package.json`), `zod`.

> **Управление состоянием:** `react-hook-form` для грида НЕ используется. Состояние ячеек — `zustand`-стор с гранулярными подписками (см. §2.2).

**Архитектурный слой (FSD):** `src/widgets/matrix/`

---

## 0. Зафиксированные архитектурные решения

| #   | Проблема                       | Решение                                                                                                    |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1   | Sticky-колонка + виртуализация | **A:** строка = CSS Grid, левая ячейка `position: sticky; left: 0` внутри виртуализированной строки (§1.3) |
| 2   | Управление состоянием          | **C:** zustand-стор, атомарные подписки на ячейку через selector-хуки (§2.2)                               |
| 3   | Мемоизация ячейки              | **A:** стабильный `onChange` + расширение компаратора + примитивные пропсы (§2.3)                          |
| 4   | Клавиатурная навигация         | **A:** declarative focus — реестр ref'ов + `scrollToIndex` + roving tabindex (§4.2)                        |
| 5   | Адаптивность                   | **C:** v1 — desktop-only, явно зафиксировано (§4.3)                                                        |

---

## 1. Архитектура компонента и интерфейсы

### 1.1. Входные типы данных

```typescript
import { RegistryField } from '@/shared/config/registry/types'

/** Значение ячейки. Union вместо `any` — выводится из `db_type` поля реестра. */
export type FieldValue = string | number | boolean | null

export interface MatrixColumn {
  id: string // e.g., "phase_1", "status_98", "outcome_99"
  title: string // Заголовок колонки (например, "Фаза 1")
  order: number
  isCurrentStatus?: boolean // Флаг для колонки 98 (текущий статус)
}

export interface MatrixGridProps {
  registryFields: RegistryField[] // Плоский массив полей (FLAT_REGISTRY)
  columns: MatrixColumn[]
  data: Record<string, Record<string, FieldValue>> // Struct: { [phaseId]: { [fieldId]: value } }
  onChange: (phaseId: string, fieldId: string, value: FieldValue) => void
  isReadOnly?: boolean
}
```

### 1.2. Двухосевая структура скролла (CSS Grid + Sticky)

- **Контейнер:** `overflow: auto; max-height: calc(100vh - 120px); position: relative;`
- **Ось Y (Фиксированная левая колонка):**
- Ширина: `320px` (`min-width: 280px`).
- `position: sticky; left: 0; z-index: 10; bg-background`.
- Отображает наименование признака (`field.label`) и индикатор категории.

- **Ось X (Фиксированная верхняя строка):**
- Высота: `48px`.
- `position: sticky; top: 0; z-index: 20; bg-background`.
- Отображает заголовки временных точек.

- **Точка пересечения (Top-Left Cell):** `position: sticky; top: 0; left: 0; z-index: 30; bg-background`.

### 1.3. Сочетание sticky-колонки и виртуализации (решение 1-A)

Каждая виртуализированная строка рендерится как CSS Grid:

```tsx
<div
  style={{ transform: `translateY(${virtualRow.start}px)` }}
  className="grid-template-columns: [320px_1fr] grid"
>
  {/* Левая ячейка — sticky по X. Sticky по Y не конфликтует
      с translateY виртуализатора, т.к. тот двигает контейнер строк,
      а не сами строки. */}
  <div className="bg-background sticky left-0 z-10">{field.label}</div>
  <div
    className="grid"
    style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(140px, 1fr))` }}
  >
    {/* ячейки фаз */}
  </div>
</div>
```

- Виртуализатор работает только по оси Y (`translateY` контейнера строк).
- Sticky по X реализуется нативно внутри каждой строки — **ноль JS-синхронизации скролла**.
- Запрещено: два отдельных слоя с ручной синхронизацией `scrollTop`, absolute-«шторка» по `scrollLeft`.

---

## 2. Производительность и Виртуализация

1. **Виртуализация строк (`@tanstack/react-virtual`):**

- Виртуализатор настраивается на родительский контейнер скролла.
- Фиксированная высота строки: `40px` (строго соблюдать для корректного расчета скролла).
- Отрисовывать только те строки, которые попадают в видимый viewport (`overscan: 5`).

2. **Изоляция состояния ячеек (Zero Global Re-renders) — zustand (решение 2-C):**

`react-hook-form` не используется. Состояние грида — zustand-стор вида `{ [phaseId]: { [fieldId]: FieldValue } }`. Каждая ячейка подписывается на свой срез через селектор — ререндерится **только изменённая ячейка**, строка и таблица не трогаются:

```ts
// src/widgets/matrix/model/matrix-store.ts
import { create } from 'zustand'

interface MatrixState {
  data: Record<string, Record<string, FieldValue>>
  setValue: (phaseId: string, fieldId: string, value: FieldValue) => void
}

export const useMatrixStore = create<MatrixState>((set) => ({
  data: {},
  setValue: (phaseId, fieldId, value) =>
    set((s) => ({
      data: {
        ...s.data,
        [phaseId]: { ...s.data[phaseId], [fieldId]: value },
      },
    })),
}))

// Гранулярный селектор-хук: подписка строго на одну ячейку
export const useCell = (phaseId: string, fieldId: string) =>
  useMatrixStore((s) => s.data[phaseId]?.[fieldId] ?? null)
```

- Ввод управляется локальным состоянием компонента `MatrixCell` (uncontrolled input).
- Коммит в стор — по `onBlur` или по дебаунсу 300ms.
- `useCell` возвращает примитив — zustand перерисует ячейку только при смене этого примитива (`Object.is`).
- Персист/синхронизация с API — отдельный сабскрайбер `useMatrixStore.subscribe` (дебаунс-очередь dirty-ячеек), не через React-ререндеры.

### 2.3. Мемоизация ячейки — детали (решение 3-A)

Zustand-селектор уже снимает ~90% лишних ререндеров, но `React.memo` остаётся вторым рубежом (ререндер строки при смене раскладки, изменении колонок, hover-эффектах уровня строки).

**Требования, без которых мемоизация не работает:**

1. **Стабильный `onChange`.** Единый колбэк создаётся в гриде один раз:

```tsx
// Внутри MatrixGrid — useCallback с пустыми зависимостями
const commit = useCallback((phaseId: string, fieldId: string, value: FieldValue) => {
  useMatrixStore.getState().setValue(phaseId, fieldId, value)
}, [])
```

Ячейка замыкает свои `phaseId`/`fieldId` внутри себя — проп `onChange` остаётся идентичным между рендерами.

2. **Только примитивные пропсы.** Ячейке НЕ передаётся объект `field`. Вместо него — вычисленные примитивы:

```tsx
interface MatrixCellProps {
  phaseId: string
  fieldId: string
  ui: UIComponent // примитив-дискриминатор фабрики рендеринга
  value: FieldValue // примитив из useCell
  disabled: boolean
  error?: string
  onChange: (v: FieldValue) => void // стабилен, см. п.1
}
```

`options` (для `select`) допустим только как проп, полученный из мемоизированного `fieldById: Map<string, RegistryField>`, который строится один раз на уровне грида (`useMemo` от `registryFields`).

3. **Расширенный компаратор** — проверяются все примитивные пропсы:

```tsx
export const MatrixCell = React.memo(
  MatrixCellBase,
  (prev, next) =>
    prev.value === next.value &&
    prev.disabled === next.disabled &&
    prev.error === next.error &&
    prev.ui === next.ui
)
```

(`phaseId`/`fieldId`/`onChange` постоянны по построению — их можно не сравнивать; `options` сравнить через `prev.options === next.options` — ссылочное равенство гарантировано `useMemo` из п.2.)

**Эффект:** при вводе в ячейку ререндерится ровно одна ячейка. При загрузке данных / переключении фазы — только изменившиеся ячейки.

---

## 3. Фабрика рендеринга ячеек (`MatrixCellRenderer`)

Компонент ячейки выбирает UI-контроллер на основе свойства `field.ui`:

- **`checkbox` / `toggle-binary`:**
- Возвращает `0` или `1` (для совместимости с D1 SQLite).
- UI: Компактный чекбокс или бинарный переключатель.

- **`select`:**
- Маппит варианты из `field.options`.
- UI: Компактный кастомный или нативный `select`.

- **`number-input` / `text-input`:**
- Компактный `input` без стрелок изменения значений (no-spinners).

- **`date-picker`:**
- Выбор даты в формате `YYYY-MM-DD`.

- **`badge-readonly`:**
- Компонент только для чтения (для вычисляемых полей `calculate`).
- Отображает рассчитанное значение (например, возраст или результат шкалы) в виде стилизованного Badge.

---

## 4. Визуальная иерархия и UX

- **Группировка секций:** При прокрутке категории (Социум, Психический статус, Фармакотерапия, Шкалы) разделяются разделительными строками с фоном `bg-muted` и `font-semibold`.
- **Подсветка активной строки/колонки:** Добавить hover-эффект для всей строки (`hover:bg-accent/50`) и визуальное выделение колонки текущего статуса (98) с помощью тонкой цветовой границы (`border-l-2 border-amber-500`).
- **Клавиатурная навигация (решение 4-A — declarative focus):**
- **Roving tabindex:** среди интерактивных элементов строки `tabIndex=0` имеет ровно одна ячейка; остальные `tabIndex=-1` (в фокус попадают по стрелкам, а не по Tab через всю таблицу).
- Tab / Shift+Tab — нативный DOM-порядок (перемещение между колонками и из таблицы наружу).
- Стрелки Up/Down — межстрочная навигация с автофокусом на ту же колонку:

```tsx
// Реестр ref'ов видимых ячеек в гриде
const cellRefs = useRef(new Map<string, HTMLElement>()) // key: `${row}:${col}`

const moveVertical = (row: number, col: number, dir: 1 | -1) => {
  const next = row + dir
  if (next < 0 || next >= rowCount) return
  rowVirtualizer.scrollToIndex(next, { align: 'auto' })
  requestAnimationFrame(() => {
    const el = cellRefs.current.get(`${next}:${col}`)
    el?.focus()
  })
}
```

- Ячейки за пределами viewport не могут получить фокус — поэтому перед фокусом обязателен `scrollToIndex` + `requestAnimationFrame` (после монтирования виртуализированной строки).
- **Адаптивность (решение 5-C):** v1 — **desktop-only** (минимальная ширина вьюпорта 1024px). Мобильный layout (карточки по фазам, компактная sticky-колонка) — отдельная задача после стабилизации v1.

---

## 5. Критерии приёмки и тесты

### 5.1. Критерии производительности (обязательные)

- Ввод в ячейку при 230 строк × 10 колонок: перерисовка **только одной ячейки**; соседние строки и строка-родитель не рендерятся повторно (проверяется в тесте через render-счётчики).
- Первый рендер грида ≤ 300ms на референсном датасете; скролл без dropped frames (проверка React Profiler / Chrome Performance).

### 5.2. Тесты

- **Unit:** фабрика рендеринга `MatrixCellRenderer` — маппинг всех `field.ui` → контроллер, корректные значения (0/1 для checkbox, `YYYY-MM-DD` для date).
- **Unit:** zustand-стор `setValue` — иммутабельность, изоляция ячеек.
- **Интеграция:** ввод в ячейку не вызывает ререндер строки/соседних ячеек (`@testing-library/react` + счётчики рендеров).
- **Интеграция:** клавиатурная навигация — стрелка Down скроллит к невидимой строке и ставит фокус в ту же колонку.
- **A11y-смоук:** roving tabindex (ровно один `tabIndex=0` на строку), aria-label у контролов.

---

## 6. Синхронизация с сервером

### 6.1. Триггер сохранения

1. Коммит значения в zustand-стор — по `onBlur` (текст/число/дата) или сразу (`checkbox`, `select`).
2. `subscribeDirty` накапливает dirty-ячейки и через дебаунс **300ms** отдаёт батч `DirtyCommit[]` в `onPersist` (вне React-ререндеров).
3. **Группировка батча по `phaseId` обязательна:** ячейки одной фазы → один `PATCH /api/phases/:id` с телом-патчем (один UPDATE = атомарно). Патчи разных фаз отправляются независимо/параллельно.
4. **Флаш перед выгрузкой:** `beforeunload` / `visibilitychange → hidden` — немедленная отправка pending-батча (`fetch` с `keepalive: true`), иначе правки за окно дебаунса теряются.
5. Индикатор состояния в шапке грида: «сохранено / сохраняется / ошибка / конфликт».

### 6.2. Токен версии `updated_at` (CAS)

1. Клиентским часам не доверяем. Единственный источник времени — **движок D1**: `updated_at` генерируется SQLite-функцией в момент исполнения запроса:
   ```sql
   -- миграция:
   updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))

   -- каждый UPDATE:
   UPDATE phases
   SET ..., updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
   WHERE id = ? AND updated_at = ?   -- Optimistic Concurrency Control
   ```
2. `updated_at` — **токен версии**, не «метка для отображения». Клиент получает её с данными фазы и возвращает в каждом PATCH.
3. `WHERE updated_at = ?` не затронуло строк → ответ **409 Conflict** с актуальной строкой фазы в теле.
4. CAS включён всегда, независимо от режима (страховка от двух вкладок/устройств одного пользователя). Формат ISO с `%f` лексикографически сортируем — годится и для `WHERE updated_at > ?` в polling.

### 6.3. Режимы работы (клиентская настройка)

- Режим — **UI-политика на клиенте** (localStorage + переключатель в шапке грида), серверу он неизвестен:
  - **`solo`** (по умолчанию): polling выключен; CAS включён.
  - **`collab`**: polling `GET /api/patients/:id/phases/changes?since=<max updated_at>` каждые 30–60с; ответ — фазы с `updated_at > since` и их значения.
- Чужие правки мержатся **по ячейкам в zustand-стор** (`setValue`), при этом **локально грязные ячейки (пользователь ещё печатает/не ушёл из поля) не затираются**.
- Благодаря zustand-селекторам подтягивание чужих правок ререндерит только изменившиеся ячейки.
- В режиме `collab` — индикатор «обновлено коллегой N сек назад».

### 6.4. Разрешение конфликтов (409)

Триггер: PATCH вернул 409 с актуальной строкой фазы (значения `serverRow` + `serverUpdatedAt`).

**Инструменты врача (UI):**

1. **Баннер конфликта по фазе** (не модалка, не блокирует остальную матрицу): «Фаза X была изменена другим исследователем в HH:MM».
2. **Дифф по ячейкам:** ячейки, где серверное значение отличается от локального, подсвечиваются (например, `ring-amber-500`), tooltip — «Ваше значение → значение коллеги».
3. **Выбор на трёх уровнях:**
   - **По ячейке** — клик по конфликтной ячейке открывает мини-меню: «Оставить моё / Принять значение коллеги» (ячейка — минимальная единица клинической правки);
   - **По фазе** — кнопки в баннере: «Принять всё чужое» (перезагрузить фазу в стор, локальный draft сбрасывается) / «Перезаписать всё моим» (повторный PATCH с текущим `serverUpdatedAt` — CAS теперь пройдёт);
   - **Merge по умолчанию** — автоматический только для непересекающихся ячеек: ячейки, которые врач не правил локально, обновляются значениями сервера молча; конфликт — только на реально пересёкшиеся ячейки. Свободный текст не мержится автоматически без участия врача.
4. **Аудит:** все разрешённые конфликты логируются (кто, когда, какое поле, чьё значение принято) — обязательное требование для клинического регистра; перезаписанная версия сохраняется в журнал.
5. После разрешения конфликта баннер снимается, `since` для polling обновляется на `serverUpdatedAt`.

**Инвариант:** данные врача не теряются молча ни в одном сценарии — перед любой автозаменой значение доступно в диффе/аудите.

### 6.5. Хранение «моё»/«чужое» в сторе

- Конфликт — **отдельный срез стора**, а не два значения в `data`. В момент конфликта `data` содержит «мою» локальную версию:

```ts
export interface CellConflict {
  mine: FieldValue // что пытался записать врач (уже в data)
  theirs: FieldValue // что вернул сервер в 409
  serverUpdatedAt: string // токен версии для повторного PATCH
}

interface MatrixState {
  data: MatrixData
  conflicts: Record<string, CellConflict> // key: `${phaseId}:${fieldId}`
  markConflict(phaseId, fieldId, c): void
  resolveConflict(phaseId, fieldId, resolution: 'mine' | 'theirs'): void
  clearConflicts(phaseId): void
}

export const useCellConflict = (phaseId, fieldId) =>
  useMatrixStore((s) => s.conflicts[`${phaseId}:${fieldId}`])
```

- Обработка 409: для ячеек неудавшегося патча, где `theirs !== mine` → `markConflict`; совпадающие → фиксация нового токена; ячейки вне патча (врач их не правил) → молчаливый auto-merge серверными значениями.
- Ячейка подписана через `useCellConflict`; проп `conflict` входит в компаратор `React.memo`. Активный конфликт: подсветка `ring-amber-500`, tooltip «Ваше: X → Значение коллеги: Y», клик — мини-меню «Оставить моё / Принять значение коллеги» → `resolveConflict`.
- Обоснование: `useCell` возвращает примитив, мемоизация и auto-merge не меняются; конфликт — «статус ячейки». Без конфликтов слой отсутствует (ноль оверхеда).

### 6.6. Аудит (D1)

- Таблица `audit_log` — системная сущность, **вне реестра** (миграция `0002_audit.sql`, не `gen:d1`). Append-only: UPDATE/DELETE запрещены логикой.
- Схема:

```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actor_id TEXT,                  -- id пользователя из сессии (nullable до появления auth)
  patient_id INTEGER NOT NULL,
  phase_id INTEGER,
  field_id TEXT NOT NULL,         -- id поля реестра или 'phase' (уровень строки)
  action TEXT NOT NULL,           -- 'update' | 'conflict_resolved' | 'phase_created' | 'phase_deleted'
  resolution TEXT,                -- 'mine' | 'theirs' (только conflict_resolved)
  old_value TEXT,                 -- JSON(FieldValue)
  new_value TEXT,                 -- JSON(FieldValue)
  overwritten_version TEXT,       -- updated_at затёртой версии (конфликты)
  base_version TEXT               -- CAS-токен, от которого писал клиент
);
CREATE INDEX idx_audit_phase ON audit_log (phase_id, ts);
CREATE INDEX idx_audit_patient ON audit_log (patient_id, ts);
```

- Значения — JSON-строки (`JSON.stringify(FieldValue)`); PII в лог не дублируется (только id).
- **Атомарность:** запись данных + аудит — один `db.batch([...])`; CAS-результат проверяется после batch, при неуспехе — отдельное событие `conflict_received`/без аудита записи.
- Репозиторий: `src/shared/api/audit-repo.ts` (`insertBatch`, `listByPhase`, `listByPatient`).
- Зависимость: ~~без аутентификации `actor_id` пуст~~ — **auth реализован** (миграция `0003_auth.sql`): сессии в D1 (`session-repo.ts`), вход через `features/auth`, `actor_id = SessionUser.id` из `requireUser()`/`getCurrentUser()`. ~~Записи матрицы — демо (mock)~~ — **реальные мутации реализованы** (этап 1, `docs/spec-stage-1.md`): Server Actions (`src/features/matrix/actions.ts`) вызывают `phase-repo.updateWithVersion` с `actorId = user.id`, аудит пишется в том же `db.batch`.

### 6.7. Порог эскалации: polling → push-обновления

Текущий режим `collab` — polling каждые 30–60 с: осознанный компромисс v1 (без WebSocket/SSE-инфраструктуры, ноль дополнительных зависимостей, работает на Workers без Durable Objects). Обратная сторона — окно необнаруженного конфликта до интервала polling.

**Пересмотреть решение (переход на push) при наступлении хотя бы одного из:**

- систематическая (не единичная) **параллельная работа ≥2 врачей над одним пациентом** в рамках одной смены — окно 30–60 с начинает ощущаться как «перезаписали, а я не видел»;
- появление **жалоб пользователей на потерянные/устаревшие данные** или рост доли разрешённых конфликтов `conflict_resolved` в аудите сверх фоновой;
- внедрение **Durable Objects** по другой причине (presence, чат, live-статусы) — тогда SSE/WS поверх DO дешевле отдельного решения.

**Кандидатное решение при эскалации:** Durable Object на пациента (координация) + SSE для рассылки `updated_at`-токенов; CAS-модель и UI конфликтов (§6.4–6.5) сохраняются без изменений — меняется только скорость обнаружения, а не механизм разрешения.

До наступления порога polling корректен: CAS гарантирует, что потеря данных невозможна в принципе, polling влияет только на скорость обнаружения, а не на целостность.
