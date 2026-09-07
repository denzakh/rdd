import { redirect } from 'next/navigation'

/**
 * Старый демо-маршрут /matrix закрыт (docs/spec-stage-2.md §1 реш.4):
 * матрица переехала на /patients/[id]/matrix.
 */
export default function MatrixRedirect() {
  redirect('/patients')
}
