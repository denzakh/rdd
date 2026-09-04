export type UIComponent =
  | 'text-input'
  | 'number-input'
  | 'checkbox'
  | 'select'
  | 'date-picker'
  | 'badge-readonly'

export interface RegistryOption {
  value: number | string
  label: string
}

export interface RegistryField {
  id: string
  label: string
  ui: UIComponent
  db_type: 'INTEGER' | 'BOOLEAN' | 'TEXT' | 'DATE' | 'FLOAT'
  options?: RegistryOption[]
  is_current_only?: boolean // Для шкал 98, 99
  calculate?: (data: any) => any
}

export type RegistryBlock = Record<string, RegistryField>
