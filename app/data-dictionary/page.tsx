import { requireUser, UserMenu } from '@/features/auth'
import { buildDataDictionary } from '@/shared/lib/registry'

/**
 * Автогенерируемый Data Dictionary (docs/data-dictionary.md).
 * Единственный источник правды — реестр полей src/shared/config/registry:
 * страница не содержит ручных описаний и всегда синхронна с реестром и D1-схемой.
 */
export default async function DataDictionaryPage() {
  const user = await requireUser()
  const sections = buildDataDictionary()
  const totalFields = sections.reduce((acc, s) => acc + s.entries.length, 0)

  return (
    <div>
      <UserMenu displayName={user.displayName} role={user.role} />
      <main className="mx-auto max-w-[1100px] space-y-8 p-6">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Словарь данных (Data Dictionary)</h1>
          <p className="text-sm text-neutral-600">
            Автогенерируется из реестра полей (<code>src/shared/config/registry</code>) — того же,
            из которого генерируется схема D1 (<code>npm run gen:d1</code>). Всего полей:{' '}
            <b>{totalFields}</b>. NULL означает, что значение не заполнено; вычисляемые поля не
            хранятся в БД и рассчитываются на лету.
          </p>
        </header>

        {sections.map((section) => (
          <section key={section.key} className="space-y-2">
            <h2 className="text-lg font-medium">{section.title}</h2>
            <div className="overflow-x-auto rounded-md border border-neutral-300">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-neutral-100 text-left">
                    <th className="border-b border-neutral-300 px-3 py-2">Поле (ID)</th>
                    <th className="border-b border-neutral-300 px-3 py-2">Название</th>
                    <th className="border-b border-neutral-300 px-3 py-2">Тип (логич./SQL)</th>
                    <th className="border-b border-neutral-300 px-3 py-2">Допустимые значения</th>
                    <th className="border-b border-neutral-300 px-3 py-2">Источник в БД</th>
                  </tr>
                </thead>
                <tbody>
                  {section.entries.map((e) => (
                    <tr key={e.id} className="align-top even:bg-neutral-50">
                      <td className="border-b border-neutral-200 px-3 py-2 font-mono text-xs">
                        {e.id}
                      </td>
                      <td className="border-b border-neutral-200 px-3 py-2">
                        {e.label}
                        {e.isCurrentOnly && (
                          <span className="ml-1 text-xs text-amber-700">
                            (только текущий статус)
                          </span>
                        )}
                        {e.isComputed && (
                          <span className="ml-1 text-xs text-blue-700">(вычисляемое)</span>
                        )}
                        {e.deprecatedSince !== null && (
                          <span className="ml-1 text-xs text-neutral-500">
                            (deprecated с v{e.deprecatedSince})
                          </span>
                        )}
                      </td>
                      <td className="border-b border-neutral-200 px-3 py-2 font-mono text-xs">
                        {e.dbType}
                        {e.dbType !== e.sqlType && ` / ${e.sqlType}`}
                      </td>
                      <td className="border-b border-neutral-200 px-3 py-2 text-xs">{e.allowed}</td>
                      <td className="border-b border-neutral-200 px-3 py-2 text-xs">
                        {e.storage ? (
                          <span className="font-mono text-xs">
                            {e.storage}.{e.id}
                          </span>
                        ) : (
                          <span className="text-neutral-500">не хранится (расчёт)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}
