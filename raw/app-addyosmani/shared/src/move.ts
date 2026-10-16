import { STATUSES, type Movable, type Status } from './types.ts'

function byPosition(a: Movable, b: Movable): number {
  return a.position - b.position || a.id.localeCompare(b.id)
}

export function planMove<T extends Movable>(
  items: T[],
  taskId: string,
  toStatus: Status,
  toIndex: number,
): T[] {
  const moving = items.find((item) => item.id === taskId)
  if (!moving || !STATUSES.includes(toStatus)) return items

  const rest = items.filter((item) => item.id !== taskId)
  const column = rest.filter((item) => item.status === toStatus).sort(byPosition)
  const index = Math.max(0, Math.min(toIndex, column.length))
  column.splice(index, 0, { ...moving, status: toStatus })
  const updatedColumn = column.map((item, position) => ({ ...item, position }))

  if (moving.status === toStatus) {
    const elsewhere = rest.filter((item) => item.status !== toStatus)
    return [...elsewhere, ...updatedColumn]
  }

  const source = rest
    .filter((item) => item.status === moving.status)
    .sort(byPosition)
    .map((item, position) => ({ ...item, position }))
  const elsewhere = rest.filter((item) => item.status !== toStatus && item.status !== moving.status)
  return [...elsewhere, ...updatedColumn, ...source]
}

export function dropTarget(
  items: Movable[],
  activeId: string,
  overId: string,
): { status: Status; index: number } | null {
  if (overId === activeId) return null
  const moving = items.find((item) => item.id === activeId)
  if (!moving) return null

  if (overId.startsWith('column:')) {
    const status = overId.slice('column:'.length) as Status
    if (!STATUSES.includes(status)) return null
    return {
      status,
      index: items.filter((item) => item.status === status && item.id !== activeId).length,
    }
  }

  const over = items.find((item) => item.id === overId)
  if (!over) return null
  const column = items.filter((item) => item.status === over.status && item.id !== activeId).sort(byPosition)
  const index = column.findIndex((item) => item.id === over.id)
  return { status: over.status, index: index < 0 ? column.length : index }
}
