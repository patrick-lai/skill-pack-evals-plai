import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Member, Task } from '@bench/shared'
import { BoardColumns } from './BoardColumns'

const members: Member[] = [
  { id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace', role: 'owner' },
]

function task(partial: Partial<Task> & Pick<Task, 'id' | 'title' | 'status' | 'position'>): Task {
  return {
    boardId: 'board-1',
    description: '',
    assigneeId: null,
    dueDate: null,
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
    ...partial,
  }
}

describe('BoardColumns', () => {
  const tasks = [
    task({ id: 't1', title: 'Write spec', status: 'todo', position: 0, dueDate: '2020-01-02' }),
    task({ id: 't2', title: 'Ship it', status: 'doing', position: 0, assigneeId: 'user-1' }),
  ]

  it('groups cards by status and shows an empty Done column', () => {
    render(
      <BoardColumns tasks={tasks} members={members} truncated={false} onMove={vi.fn()} onOpen={vi.fn()} onCreate={vi.fn()} />,
    )
    expect(screen.getByRole('heading', { name: 'To do' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Doing' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByText('Write spec')).toBeInTheDocument()
    expect(screen.getByText('Ship it')).toBeInTheDocument()
    expect(screen.getAllByText('Nothing here yet.')).toHaveLength(1)
    expect(screen.getByText(/Overdue/)).toBeInTheDocument()
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument()
  })

  it('moves a card from the select', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn()
    render(
      <BoardColumns tasks={tasks} members={members} truncated={false} onMove={onMove} onOpen={vi.fn()} onCreate={vi.fn()} />,
    )
    await user.selectOptions(screen.getByLabelText('Move Write spec'), 'done')
    expect(onMove).toHaveBeenCalledWith('t1', 'done', 0)
  })

  it('shows the truncation note', () => {
    render(
      <BoardColumns tasks={[]} members={members} truncated onMove={vi.fn()} onOpen={vi.fn()} onCreate={vi.fn()} />,
    )
    expect(screen.getByText(/first 200 tasks/)).toBeInTheDocument()
  })
})
