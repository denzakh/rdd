import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  initMatrixData,
  markConflict,
  resolveConflict,
  subscribeDirty,
  useMatrixStore,
  type DirtyCommit,
} from '@/widgets/matrix/model/matrix-store'

const resetStore = (): void => {
  useMatrixStore.setState({ data: {}, conflicts: {} })
}

beforeEach(resetStore)
afterEach(() => {
  vi.useRealTimers()
})

describe('matrix-store: данные', () => {
  it('setValue пишет ячейку, не затрагивая соседние', () => {
    useMatrixStore.getState().setValue('p1', 'f1', 5)
    useMatrixStore.getState().setValue('p1', 'f2', 'text')
    useMatrixStore.getState().setValue('p2', 'f1', true)

    const { data } = useMatrixStore.getState()
    expect(data.p1?.f1).toBe(5)
    expect(data.p1?.f2).toBe('text')
    expect(data.p2?.f1).toBe(true)
  })
})

describe('matrix-store: конфликты (§6.5)', () => {
  it('markConflict добавляет, resolveConflict mine — оставляет data как есть', () => {
    useMatrixStore.getState().setValue('p1', 'f1', 'mine')
    useMatrixStore.getState().markConflict('p1', 'f1', {
      mine: 'mine',
      theirs: 'theirs',
      serverUpdatedAt: 'v2',
    })
    expect(useMatrixStore.getState().conflicts['p1:f1']?.theirs).toBe('theirs')

    useMatrixStore.getState().resolveConflict('p1', 'f1', 'mine')
    expect(useMatrixStore.getState().conflicts['p1:f1']).toBeUndefined()
    expect(useMatrixStore.getState().data.p1?.f1).toBe('mine')
  })

  it('resolveConflict theirs — data перезаписывается значением коллеги', () => {
    useMatrixStore.getState().setValue('p1', 'f1', 'mine')
    useMatrixStore.getState().markConflict('p1', 'f1', {
      mine: 'mine',
      theirs: 'theirs',
      serverUpdatedAt: 'v2',
    })
    useMatrixStore.getState().resolveConflict('p1', 'f1', 'theirs')
    expect(useMatrixStore.getState().data.p1?.f1).toBe('theirs')
    expect(useMatrixStore.getState().conflicts['p1:f1']).toBeUndefined()
  })

  it('resolveConflict несуществующего конфликта — no-op', () => {
    useMatrixStore.getState().setValue('p1', 'f1', 'x')
    useMatrixStore.getState().resolveConflict('p1', 'f1', 'theirs')
    expect(useMatrixStore.getState().data.p1?.f1).toBe('x')
  })

  it('clearConflicts снимает конфликты только своей фазы', () => {
    const store = useMatrixStore.getState()
    store.markConflict('p1', 'a', { mine: 1, theirs: 2, serverUpdatedAt: 'v' })
    store.markConflict('p1', 'b', { mine: 1, theirs: 2, serverUpdatedAt: 'v' })
    store.markConflict('p2', 'a', { mine: 1, theirs: 2, serverUpdatedAt: 'v' })

    useMatrixStore.getState().clearConflicts('p1')
    expect(Object.keys(useMatrixStore.getState().conflicts)).toEqual(['p2:a'])
  })

  it('императивные экшены работают вне React', () => {
    markConflict('p', 'f', { mine: 1, theirs: 2, serverUpdatedAt: 'v' })
    expect(useMatrixStore.getState().conflicts['p:f']).toBeDefined()
    resolveConflict('p', 'f', 'theirs')
    expect(useMatrixStore.getState().conflicts['p:f']).toBeUndefined()
  })
})

describe('matrix-store: subscribeDirty', () => {
  it('батчит изменённые ячейки с дебаунсом 300 мс', () => {
    vi.useFakeTimers()
    const batches: DirtyCommit[][] = []
    subscribeDirty((batch) => batches.push(batch))

    initMatrixData({ p1: { a: 1 } })
    useMatrixStore.getState().setValue('p1', 'a', 2)
    useMatrixStore.getState().setValue('p1', 'b', 'x')

    // до 300 мс — ничего не ушло
    vi.advanceTimersByTime(299)
    expect(batches).toHaveLength(0)

    vi.advanceTimersByTime(1)
    expect(batches).toHaveLength(1)
    expect(batches[0]).toEqual([
      { phaseId: 'p1', fieldId: 'a', value: 2 },
      { phaseId: 'p1', fieldId: 'b', value: 'x' },
    ])
  })

  it('быстрые изменения одной ячейки схлопываются в одно значение', () => {
    vi.useFakeTimers()
    const batches: DirtyCommit[][] = []
    subscribeDirty((batch) => batches.push(batch))

    useMatrixStore.getState().setValue('p1', 'a', 1)
    useMatrixStore.getState().setValue('p1', 'a', 2)
    useMatrixStore.getState().setValue('p1', 'a', 3)
    vi.advanceTimersByTime(300)

    expect(batches).toHaveLength(1)
    expect(batches[0]).toEqual([{ phaseId: 'p1', fieldId: 'a', value: 3 }])
  })

  it('отписка прекращает батчи', () => {
    vi.useFakeTimers()
    const batches: DirtyCommit[][] = []
    const unsubscribe = subscribeDirty((batch) => batches.push(batch))

    useMatrixStore.getState().setValue('p1', 'a', 1)
    unsubscribe()
    useMatrixStore.getState().setValue('p1', 'a', 2)
    vi.advanceTimersByTime(1000)

    expect(batches).toHaveLength(0)
  })
})
