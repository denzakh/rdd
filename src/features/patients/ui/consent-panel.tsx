'use client'

/**
 * Блок жизненного цикла согласия на карточке пациента:
 * статус (подписано / не подписано / отозвано) и действия зафиксировать/отозвать.
 * Server Actions: signConsentAction / withdrawConsentAction (useActionState).
 * Отозвать незафиксированное согласие нельзя — иначе пациент выпал бы из
 * отчётов без основания; отозванное согласие исключает пациента из
 * отчётов/экспорта (docs/ru/consent.md §1).
 */
import { useActionState } from 'react'
import { signConsentAction, withdrawConsentAction, type PatientActionState } from '../api/actions'

export type ConsentStatus = {
  version: string | null
  date: string | null
  withdrawnAt: string | null
}

export function ConsentPanel({
  patientId,
  consent,
  canWrite,
}: {
  patientId: number
  consent: ConsentStatus
  canWrite: boolean
}) {
  const [signState, signAction, signPending] = useActionState<PatientActionState, FormData>(
    signConsentAction,
    {}
  )
  const [withdrawState, withdrawAction, withdrawPending] = useActionState<
    PatientActionState,
    FormData
  >(withdrawConsentAction, {})
  const error = signState.error ?? withdrawState.error
  const withdrawn = consent.withdrawnAt !== null
  // «Зафиксировано» = есть версия и нет отзыва. Не зафиксированное согласие
  // отозвать нельзя (у легаси-записей без версии кнопка — «Зафиксировать»),
  // иначе отзыв исключил бы пациента из отчётов без основания (consent.md §1).
  const signed = consent.version !== null && !withdrawn

  return (
    <section className="rounded-md border border-neutral-200 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium">Согласие: </span>
          {withdrawn ? (
            <span className="text-red-700">
              отозвано {consent.withdrawnAt!.slice(0, 10)}
              <span className="text-neutral-500">
                {' '}
                (данные исключены из отчётов/экспорта, но не удалены)
              </span>
            </span>
          ) : consent.version ? (
            <span className="text-green-700">
              подписано{consent.date ? ` ${consent.date.slice(0, 10)}` : ''} ({consent.version})
            </span>
          ) : (
            <span className="text-amber-700">не подписано</span>
          )}
        </div>

        {canWrite && (
          <form action={signed ? withdrawAction : signAction}>
            <input type="hidden" name="id" value={String(patientId)} />
            <button
              type="submit"
              disabled={signPending || withdrawPending}
              className={`rounded-md px-3 py-1.5 text-xs text-white disabled:opacity-50 ${
                signed ? 'bg-red-700 hover:bg-red-600' : 'bg-green-700 hover:bg-green-600'
              }`}
            >
              {signed
                ? withdrawPending
                  ? 'Отзыв…'
                  : 'Отозвать согласие'
                : signPending
                  ? 'Фиксация…'
                  : withdrawn
                    ? 'Подписать согласие'
                    : 'Зафиксировать согласие'}
            </button>
          </form>
        )}
      </div>
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </section>
  )
}
