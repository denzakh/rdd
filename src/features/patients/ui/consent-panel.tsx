'use client'

/**
 * Блок жизненного цикла согласия на карточке пациента:
 * статус (подписано / отозвано) и действия подписать/отозвать.
 * Server Actions: signConsentAction / withdrawConsentAction (useActionState).
 * Пациент с отозванным согласием исключается из отчётов/экспорта.
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
          <form action={withdrawn ? signAction : withdrawAction}>
            <input type="hidden" name="id" value={String(patientId)} />
            <button
              type="submit"
              disabled={signPending || withdrawPending}
              className={`rounded-md px-3 py-1.5 text-xs text-white disabled:opacity-50 ${
                withdrawn ? 'bg-green-700 hover:bg-green-600' : 'bg-red-700 hover:bg-red-600'
              }`}
            >
              {withdrawn
                ? signPending
                  ? 'Подписание…'
                  : 'Подписать согласие'
                : withdrawPending
                  ? 'Отзыв…'
                  : 'Отозвать согласие'}
            </button>
          </form>
        )}
      </div>
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </section>
  )
}
