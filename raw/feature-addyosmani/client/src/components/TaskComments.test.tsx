import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Comment } from '../types';
import { TaskComments } from './TaskComments';

const grace: Comment = {
  id: 'comment-grace',
  taskId: 'task-1',
  body: 'The card path needs a second pass.',
  createdAt: '2026-10-15T15:04:00.000Z',
  author: { id: 'user-grace', name: 'Grace Hopper', email: 'grace@example.com' },
};

const ada: Comment = {
  id: 'comment-ada',
  taskId: 'task-1',
  body: 'I will revise the diagram.',
  createdAt: '2026-10-15T16:10:00.000Z',
  author: { id: 'user-ada', name: 'Ada Lovelace', email: 'ada@example.com' },
};

function renderComments(overrides: Partial<Parameters<typeof TaskComments>[0]> = {}) {
  const props = {
    comments: [grace, ada],
    currentUserId: 'user-ada',
    phase: 'ready' as const,
    error: null,
    pending: false,
    onAdd: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onRetry: vi.fn(),
    ...overrides,
  };
  render(<TaskComments {...props} />);
  return props;
}

describe('TaskComments', () => {
  it('shows each author, the comment, and the time', () => {
    renderComments();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('The card path needs a second pass.')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    const times = screen.getAllByRole('time');
    expect(times[0]).toHaveAttribute('dateTime', '2026-10-15T15:04:00.000Z');
    expect(times[0]?.textContent).not.toBe('');
    expect(times[1]).toHaveAttribute('dateTime', '2026-10-15T16:10:00.000Z');
  });

  it('lets the current user delete only their own comment', async () => {
    const user = userEvent.setup();
    const props = renderComments();
    expect(screen.queryByRole('button', { name: 'Delete comment by Grace Hopper' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete comment by Ada Lovelace' }));
    expect(props.onDelete).toHaveBeenCalledWith('comment-ada');
  });

  it('adds the trimmed comment', async () => {
    const user = userEvent.setup();
    const props = renderComments({ comments: [] });
    await user.type(screen.getByLabelText('Comment'), '  Hold the demonstration.  ');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(props.onAdd).toHaveBeenCalledWith('Hold the demonstration.');
  });

  it('asks for text before adding an empty comment', async () => {
    const user = userEvent.setup();
    const props = renderComments({ comments: [] });
    await user.click(screen.getByRole('button', { name: 'Add comment' }));
    expect(props.onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Comment is required');
  });

  it('shows an empty thread', () => {
    renderComments({ comments: [] });
    expect(screen.getByText('No comments yet')).toBeInTheDocument();
  });

  it('shows a load failure and retries', async () => {
    const user = userEvent.setup();
    const props = renderComments({
      comments: [],
      phase: 'error',
      error: 'Could not load comments',
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load comments');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(props.onRetry).toHaveBeenCalledOnce();
  });
});
