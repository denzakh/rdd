export { MatrixGrid, type MatrixGridProps } from './ui/matrix-grid'
export { MatrixCell } from './ui/matrix-cell'
export {
  useMatrixStore,
  useCell,
  useCellConflict,
  initMatrixData,
  subscribeDirty,
  markConflict,
  resolveConflict,
  clearConflicts,
  type MatrixData,
  type DirtyCommit,
  type CellConflict,
} from './model/matrix-store'
export { buildMatrixRows } from './model/matrix-rows'
export { validateCellValue } from './model/validate'
export type { MatrixColumn, FieldValue } from './types'
