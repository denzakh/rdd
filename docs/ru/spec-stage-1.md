# Спека этапа 1: Реальные мутации данных матрицы (./spec-stage-1.md)

**Статус:** спека · **Зависимости:** auth (готово), matrix-widget (готово), phase-repo (готово)
**Слой FSD:** `src/features/matrix` (новый) + доработка `app/matrix/`
**Цель:** убрать демо-mock из `app/matrix/matrix-demo.tsx` — данные читаются из D1 через
`phase-repo.listByPatient`, изменения пишутся Server Actions с CAS, валидацией и аудитом.

---

## 1. Зафиксированные решения

| #   | Проблема                  | Решение                                                                                      |
| --- | ------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Транспорт клиент → сервер | Server Actions (`'use server'`), без REST-роутов; вызов из `subscribeDirty`-колбэка          |
| 2   | Валидация входа           | Zod: `phaseSchema` из `src/shared/lib/registry/to-zod.ts` + whitelist колонок `DATA_COLUMNS` |
| 3   | Конкурентность            | Уже реализовано в `phase-repo.updateWithVersion` (CAS по `updated_at`) — используем как есть |
| 4   | Авторизация мутаций       | `requireUser()` + `canWrite(user)` в каждом action (readonly — отказ)                        |
| 5   | Аудит                     | Внутри `updateWithVersion` (один `db.batch`), `actorId` = `SessionUser.id`                   |

## 2. Контракты действий (`src/features/matrix/actions.ts`)

```typescript
'use server'

type ActionResult =
  | { ok: true; applied: true; row: PhaseRow }
  | { ok: true; applied: false; row: PhaseRow } // конфликт 409: row = актуальная строка сервера
  | { ok: false; error: string }

/** Пакетное сохранение dirty-ячеек одной фазы (выход subscribeDirty). */
export async function savePhaseCells(
  patientId: number,
  phaseId: number,
  cells: Array<{ fieldId: string; value: FieldValue }>,
  baseVersion: string
): Promise<ActionResult>

/** Создание новой фазы (колонка «+ Фаза» в гриде). */
export async function createPhase(
  patientId: number
): Promise<{ ok: true; phaseId: number; row: PhaseRow } | { ok: false; error: string }>

/** Удаление фазы (action: 'phase_deleted' в аудит). */
export async function deletePhase(patientId: number, phaseId: number): Promise<ActionResult>
```

Требования к `savePhaseCells`:

1. **Авторизация:** `const user = await requireUser(); if (!canWrite(user)) return { ok: false, error: 'readonly' }`.
2. **Валидация:** собранный patch прогоняется через `phaseSchema.partial()`; ключи patch'а
   фильтруются по `DATA_COLUMNS` из `phase-repo.ts` (системные `id`, `patient_id`, `phase_order_id`
   клиентом не передаются никогда). Некорректное значение ячейки → `ok: false` с перечнем полей.
3. **CAS:** патч уходит в `phaseRepo.updateWithVersion(phaseId, patch, baseVersion, user.id)`.
   - `applied: true` → вернуть свежую строку; клиент обновляет `baseVersion = row.updated_at`.
   - `applied: false` → клиент выполняет сценарий конфликта (§4).
4. **Создание/удаление фаз** — тоже через `db.batch` с аудитом (`phase_created` / `phase_deleted`,
   `field_id: 'phase'`); удаление — только если фаза пуста или подтверждена модалкой (см. §5).

## 3. Клиентская интеграция

- `app/matrix/page.tsx` (server): `requireUser()`, загрузка пациента и фаз
  (`patientRepo`, `phaseRepo.listByPatient`), маппинг `PhaseRow[]` → `MatrixData`
  (ключи — `phase_order_id`-колонки: анамнестические фазы, 98, 99) и передача
  `baseVersion` (по `updated_at` каждой строки) в клиентский компонент.
- `matrix-demo.tsx` → `matrix-client.tsx`: `onPersist` вызывает `savePhaseCells`
  с накопленным батчем; состояние загрузки/ошибки — тост в углу, блокировка ввода
  не требуется (очередь dirty продолжается).
- Отказ `canWrite` (роль readonly): грид рендерится с `isReadOnly` сразу по пропу из
  серверной страницы; action дублирует проверку (не доверяем клиенту).

## 4. Сценарий конфликта (реализация §6.4–6.5 ./matrix.md)

1. `applied: false` → для каждой ячейки батча сравнить `mine` (в сторe) с `theirs` (`row[fieldId]`):
   - `mine !== theirs` → `markConflict(phaseId, fieldId, { mine, theirs, serverUpdatedAt: row.updated_at })`;
   - равные → молча обновить токен версии;
   - ячейки вне батча → не трогаем (auto-merge сервером).
2. `resolveConflict('mine')` → повторный `savePhaseCells` с патчем только этой ячейки и
   `baseVersion = serverUpdatedAt`; `resolveConflict('theirs')` → только снятие флага.
3. После полного разрешения — `clearConflicts(phaseId)` и обновление токена версии.

## 5. UX создания/удаления фаз

- Кнопка «+ Фаза» в шапке грида → `createPhase` → перезагрузка списка фаз (revalidate / `router.refresh`).
- Удаление фазы: confirm-модалка с перечнем заполненных полей, если они есть; фазы 98/99 удалять нельзя.

## 6. Критерии приёмки

1. `/matrix` (или `/patients/[id]`) без mock: данные из D1, ввод ячейки → через 300 мс дебаунса запись в БД, строка в `audit_log` с непустым `actor_id`.
2. Два окна браузера: изменение одной ячейки во втором окне → в первом — конфликт-подсветка, оба разрешения работают, данные не теряются.
3. Роль `readonly`: ячейки не редактируются, прямой вызов action возвращает `readonly`.
4. `npm run lint`, `npx tsc --noEmit` — без ошибок.
