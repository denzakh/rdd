# Техническая и карьерная документация проекта RDD (Registry-Driven Development)

**Версия:** 1.0

**Автор:** Денис Захарченко, MD, PhD (Lead Software Engineer & Frontend Architect)

**Назначение документа:** Сквозная спецификация архитектуры, стека и бизнес-логики для передаче ИИ-исполнителю (AI-coder) и презентации в еврозоне (HealthTech / MedTech).

---

## 1. Общий контекст и назначение проекта

Проект представляет собой высокопроизводительный медицинский регистр и аналитический прототип для научных исследований депрессивных расстройств.

- **Клиническая сущность:** Система структурирует и связывает клинические и фармакотерапевтические признаки, отслеживая динамику состояния пациента по анамнестическим и текущим фазам (точки 1..N, 98 — текущий статус, 99 — выход).

- **Инженерное назначение:** Демонстрационный проект уровня Senior/Architect, показывающий решение сложных задач по управлению типами, валидации и вычислениям на Edge-инфраструктуре без тяжелых внешних зависимостей.

---

## 2. Архитектура и Edge-инфраструктура

### 2.1. Технологический стек

- **Framework:** Next.js 15+ (App Router, Server Actions, ZSA).

- **Runtime:** Cloudflare Workers / Pages via `@opennextjs/cloudflare` (режим `nodejs_compat`).

- **Methodology:** Feature-Sliced Design (FSD).
- **Validation & Types:** Zod, TypeScript (Strict mode).

- **Localization & Formatters:** Native `Intl` API.

### 2.2. Конфигурация слоев FSD (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "es2024",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"],
      "@app/*": ["./src/app/*"],
      "@pages/*": ["./src/pages/*"],
      "@widgets/*": ["./src/widgets/*"],
      "@features/*": ["./src/features/*"],
      "@entities/*": ["./src/entities/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

---

## 3. Ядро системы: Registry (Single Source of Truth)

Архитектура построена по принципу **Registry-driven development**: единый декларируемый TS-объект выступает источником правды для схем БД, Zod-валидации, UI-рендеринга и вычислений.

### 3.1. Структура файлов (`src/shared/config/registry/`)

- `patient.ts`: Паспортная часть, социальный статус, демография, вычисление возраста.

- `status.ts`: Психический статус, объективные симптомы, психотика.

- `therapy.ts`: Фармакотерапия (АД, нейролептики, транквилизаторы, дозы, способы введения, причины смены).

- `phase.ts`: Временные характеристики и логика управления фазами.

- `scales.ts`: Шкалы (HAM-D, MMSE, Бек, тест рисования часов).

- `index.ts`: Точка сборки. Экспортирует сгруппированный `REGISTRY` (для UI) и плоский `FLAT_REGISTRY` (для API и Zod).

### 3.2. Базовые типы (`types.ts`)

```typescript
export type UIComponent =
  | 'text-input'
  | 'number-input'
  | 'checkbox'
  | 'select'
  | 'date-picker'
  | 'badge-readonly'
  | 'toggle-binary'

export interface RegistryOption {
  value: number | string
  label: string
}

export interface RegistryField {
  id: string
  label: { ru: string; en: string } | string
  ui: UIComponent
  db_type: 'INTEGER' | 'BOOLEAN' | 'TEXT' | 'DATE' | 'FLOAT'
  options?: RegistryOption[]
  is_current_only?: boolean
  calculate?: (data: Record<string, any>) => any
  scope?: 'patient' | 'phase'
}

export type RegistryBlock = Record<string, RegistryField>
```

---

## 4. Вычисления и Валидация

### 4.1. Логика расчетов (`src/shared/lib/intl/calculations.ts`)

Вычисления выполняются с использованием нативных объектов `Date` и `Intl` для гарантированной совместимости с V8 / Cloudflare Workers:

```typescript
export const diffYears = (
  dateStart: string | Date | number,
  dateEnd: string | Date | number
): number => {
  const start = new Date(dateStart)
  const end = new Date(dateEnd)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0

  let years = end.getFullYear() - start.getFullYear()
  const monthDiff = end.getMonth() - start.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < start.getDate())) {
    years--
  }
  return years > 0 ? years : 0
}

export const diffMonths = (dateStart: string | Date, dateEnd: string | Date): number => {
  const start = new Date(dateStart)
  const end = new Date(dateEnd)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0

  let months = (end.getFullYear() - start.getFullYear()) * 12
  months += end.getMonth() - start.getMonth()
  if (end.getDate() < start.getDate()) {
    months--
  }
  return months > 0 ? months : 0
}
```

### 4.2. Динамический генератор Zod (`src/shared/lib/registry/to-zod.ts`)

```typescript
import { z } from 'zod'
import { FLAT_REGISTRY } from '@/shared/config/registry'

export const generateSchema = () => {
  const shape: Record<string, any> = {}

  Object.entries(FLAT_REGISTRY).forEach(([key, field]: [string, any]) => {
    let validator

    switch (field.db_type) {
      case 'BOOLEAN':
        validator = z.coerce.boolean()
        break
      case 'INTEGER':
      case 'FLOAT':
        validator = z.number()
        break
      case 'DATE':
        validator = z.union([z.date(), z.string()])
        break
      case 'TEXT':
        validator = z.string()
        break
      default:
        validator = z.any()
    }

    shape[key] = field.required ? validator : validator.optional().nullable()
  })

  return z.object(shape)
}

export const phaseSchema = generateSchema()
```

---

## 5. Бэклог и следующие шаги для ИИ-исполнителя

1. **Нормализация `therapy.ts`:** Привести структуру файла к полностью плоскому виду (без вложенных под-объектов), исправить все ключи `db` на `db_type` для корректной работы `FLAT_REGISTRY`.
2. **D1 Migration Generator:** Создать утилиту для автоматической генерации SQL-файла миграций (`schema.sql`) для Cloudflare D1 на основе типов из `FLAT_REGISTRY`.
3. **Виджет «Матрица» (`src/widgets/matrix`):** Реализовать UI-компонент таблицы ввода и отображения динамических фаз заболевания, сгруппированный по секциям `REGISTRY` с условным рендерингом компонентов по полю `field.ui`.
