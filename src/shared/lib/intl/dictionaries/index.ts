import { en, type DictShape } from './en'
import { ru } from './ru'

export type Namespaces = DictShape
export type Namespace = keyof Namespaces
export type LocaleDict = Namespaces[Namespace]
export { en, ru }

export const dictFor = (locale: 'ru' | 'en'): Namespaces =>
  (locale === 'en' ? en : ru) as Namespaces
