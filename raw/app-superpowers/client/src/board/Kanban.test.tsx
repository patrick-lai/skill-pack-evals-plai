import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Task } from '@boardline/shared';
import { Kanban } from './Kanban';

function task(overrides: Partial<Task> & Pick<Task, 'id' | 'title' | 'status'>): Task {
  return {
    boardId: 'board',
    description: '',
    assigneeId: null,
    dueDate: null,
    position: 0,
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('Kanban', () => {
  it('renders a task in its status column and marks only open tasks overdue', () => {
    render(
      <Kanban
        tasks={[
          task({ id: 'a', title: 'Write spec', status: 'todo', dueDate: '2026-10-01' }),
          task({ id: 'b', title: 'Shipped', status: 'done', dueDate: '2026-10-01' }),
        ]}
        members={[]}
        today="2026-10-15"
        onOpen={() => {}}
        onMove={() => {}}
      />,
    );

    const todo = screen.getByRole('region', { name: 'Todo' });
    expect(within(todo).getByText('Write spec')).toBeInTheDocument();
    expect(within(todo).getByText('Due Oct 1')).toBeInTheDocument();
    expect(within(todo).getByText('Write spec').closest('[data-overdue]')).toHaveAttribute(
      'data-overdue',
      'true',
    );

    const done = screen.getByRole('region', { name: 'Done' });
    expect(within(done).getByText('Shipped').closest('[data-overdue]')).toHaveAttribute(
      'data-overdue',
      'false',
    );
  });
});
