import { describe, expect, it } from 'vitest'
import { dropTarget, planMove, type Movable } from '@bench/shared'

function card(id: string, status: Movable['status'], position: number): Movable {
  return { id, status, position }
}

describe('planMove', () => {
  const items = [card('a', 'todo', 0), card('b', 'todo', 1), card('c', 'todo', 2)]

  it('moves a card onto an empty column', () => {
    const next = planMove(items, 'c', 'doing', 0)
    const doing = next.filter((item) => item.status === 'doing')
    const todo = next.filter((item) => item.status === 'todo').sort((a, b) => a.position - b.position)
    expect(doing.map((item) => item.id)).toEqual(['c'])
    expect(todo.map((item) => [item.id, item.position])).toEqual([
      ['a', 0],
      ['b', 1],
    ])
  })

  it('reorders inside a column', () => {
    const next = planMove(items, 'c', 'todo', 0)
    const todo = next.filter((item) => item.status === 'todo').sort((a, b) => a.position - b.position)
    expect(todo.map((item) => item.id)).toEqual(['c', 'a', 'b'])
  })

  it('clamps an index past the end', () => {
    const next = planMove(items, 'a', 'done', 9)
    expect(next.find((item) => item.id === 'a')).toMatchObject({ status: 'done', position: 0 })
  })

  it('leaves the list alone when the card is missing', () => {
    expect(planMove(items, 'missing', 'done', 0)).toBe(items)
  })
})

describe('dropTarget', () => {
  const items = [card('a', 'todo', 0), card('b', 'doing', 0)]

  it('drops onto a column', () => {
    expect(dropTarget(items, 'a', 'column:done')).toEqual({ status: 'done', index: 0 })
  })

  it('drops onto another card', () => {
    expect(dropTarget(items, 'a', 'b')).toEqual({ status: 'doing', index: 0 })
  })

  it('ignores a drop onto itself', () => {
    expect(dropTarget(items, 'a', 'a')).toBeNull()
  })
})
