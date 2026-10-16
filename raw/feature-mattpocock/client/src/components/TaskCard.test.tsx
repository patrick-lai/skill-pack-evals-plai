import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { TaskCardView } from './TaskCard';

const task: Task = {
  id: 'task-1',
  boardId: 'board-1',
  title: 'Write the brief',
  description: 'Cover the audience and the date.',
  status: 'todo',
  assigneeId: 'user-1',
  assignee: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
  dueDate: '2020-01-02',
  position: 0,
  commentCount: 2,
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
};

describe('TaskCardView', () => {
  it('shows the title, description, assignee, and overdue date', () => {
    render(<TaskCardView task={task} />);
    expect(screen.getByRole('heading', { name: 'Write the brief' })).toBeInTheDocument();
    expect(screen.getByText('Cover the audience and the date.')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
  });

  it('shows how many comments the task has', () => {
    render(<TaskCardView task={task} />);
    expect(screen.getByText('2 comments')).toBeInTheDocument();
  });

  it('uses the singular when a task has one comment', () => {
    render(<TaskCardView task={{ ...task, commentCount: 1 }} />);
    expect(screen.getByText('1 comment')).toBeInTheDocument();
  });
});
