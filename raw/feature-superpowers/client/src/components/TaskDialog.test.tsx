import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Comment, Task } from '../types';
import { TaskDialog } from './TaskDialog';

const task: Task = {
  id: 'task-1',
  boardId: 'board-1',
  title: 'Coil the line',
  description: '',
  status: 'todo',
  assigneeId: null,
  assignee: null,
  dueDate: null,
  position: 0,
  commentCount: 1,
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
};

const comment: Comment = {
  id: 'comment-1',
  taskId: 'task-1',
  body: 'The tide turns at four.',
  createdAt: '2026-10-15T23:38:00.000Z',
  author: { id: 'user-ada', name: 'Ada Lovelace', email: 'ada@example.com' },
};

const comments = {
  status: 'ready' as const,
  comments: [comment],
  error: null,
  currentUserId: 'user-ada',
  onAdd: vi.fn().mockResolvedValue(undefined),
  onDelete: vi.fn().mockResolvedValue(undefined),
  onRetry: vi.fn(),
};

describe('TaskDialog comments', () => {
  it('hides the composer until the task is saved', () => {
    render(
      <TaskDialog
        open
        onOpenChange={() => {}}
        task={null}
        members={[]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        comments={comments}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Add comment' })).not.toBeInTheDocument();
  });

  it('shows comments on a saved task', () => {
    render(
      <TaskDialog
        open
        onOpenChange={() => {}}
        task={task}
        members={[]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        comments={comments}
      />,
    );
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('scrolls the task fields without taking the close control with them', () => {
    render(
      <TaskDialog
        open
        onOpenChange={() => {}}
        task={task}
        members={[]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        comments={comments}
      />,
    );
    const dialog = screen.getByRole('dialog');
    const scroller = screen.getByTestId('task-dialog-scroll');
    expect(scroller).toHaveClass('overflow-y-auto');
    expect(scroller.contains(screen.getByRole('button', { name: 'Close' }))).toBe(false);
    expect(dialog.className).not.toMatch(/overflow-y-auto/);
  });
});
