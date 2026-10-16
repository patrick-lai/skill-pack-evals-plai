import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Comment } from '../types';
import { TaskComments } from './TaskComments';

const ada: Comment = {
  id: 'comment-1',
  taskId: 'task-1',
  body: 'The tide turns at four.',
  createdAt: '2026-10-15T23:38:00.000Z',
  author: { id: 'user-ada', name: 'Ada Lovelace', email: 'ada@example.com' },
};

const grace: Comment = {
  id: 'comment-2',
  taskId: 'task-1',
  body: 'The warp is frayed.',
  createdAt: '2026-10-15T23:40:00.000Z',
  author: { id: 'user-grace', name: 'Grace Hopper', email: 'grace@example.com' },
};

function renderComments(overrides: Partial<Parameters<typeof TaskComments>[0]> = {}) {
  const props = {
    status: 'ready' as const,
    comments: [ada],
    error: null,
    currentUserId: 'user-ada',
    onAdd: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onRetry: vi.fn(),
    ...overrides,
  };
  render(<TaskComments {...props} />);
  return props;
}

describe('TaskComments', () => {
  it('shows the author, time, and a delete button for the current user', () => {
    renderComments();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Oct 15, 2026, 11:38 PM')).toBeInTheDocument();
    expect(screen.getByText('The tide turns at four.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete comment from Ada Lovelace' })).toBeInTheDocument();
  });

  it('hides delete on someone else’s comment', () => {
    renderComments({ comments: [grace], currentUserId: 'user-ada' });
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete comment from Grace Hopper' })).not.toBeInTheDocument();
  });

  it('shows an empty state', () => {
    renderComments({ comments: [] });
    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    renderComments({ status: 'loading', comments: [] });
    expect(screen.getByText('Loading comments…')).toBeInTheDocument();
    expect(screen.getByLabelText('Comment')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add comment' })).toBeDisabled();
  });

  it('shows an error and retries', async () => {
    const user = userEvent.setup();
    const props = renderComments({ status: 'error', comments: [], error: 'Could not load comments' });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load comments');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(props.onRetry).toHaveBeenCalledOnce();
  });

  it('adds the typed comment', async () => {
    const user = userEvent.setup();
    const props = renderComments({ comments: [] });
    await user.type(screen.getByLabelText('Comment'), 'The tide turns at four.');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(props.onAdd).toHaveBeenCalledWith('The tide turns at four.');
  });

  it('refuses an empty comment', async () => {
    const user = userEvent.setup();
    const props = renderComments({ comments: [] });
    await user.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(props.onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Comment is required');
  });

  it('deletes the current user’s comment', async () => {
    const user = userEvent.setup();
    const props = renderComments();
    await user.click(screen.getByRole('button', { name: 'Delete comment from Ada Lovelace' }));
    expect(props.onDelete).toHaveBeenCalledWith('comment-1');
  });
});
