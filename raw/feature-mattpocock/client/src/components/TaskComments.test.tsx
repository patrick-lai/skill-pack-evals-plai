import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Comment } from '../types';
import { TaskComments } from './TaskComments';

const ada = { id: 'ada', name: 'Ada Lovelace', email: 'ada@example.com' };
const grace = { id: 'grace', name: 'Grace Hopper', email: 'grace@example.com' };

const comments: Comment[] = [
  {
    id: 'c1',
    taskId: 'task-1',
    body: 'Feed the cards from the left.',
    createdAt: '2026-10-15T14:30:00.000Z',
    author: ada,
  },
  {
    id: 'c2',
    taskId: 'task-1',
    body: 'I will sketch the mill tonight.',
    createdAt: '2026-10-15T15:05:00.000Z',
    author: grace,
  },
];

describe('TaskComments', () => {
  it('shows each comment with its author and time', () => {
    render(
      <TaskComments
        comments={comments}
        currentUserId={ada.id}
        onAdd={async () => {}}
        onDelete={async () => {}}
      />,
    );

    expect(screen.getByText('Feed the cards from the left.')).toBeInTheDocument();
    expect(screen.getByText('I will sketch the mill tonight.')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('Oct 15, 2:30 PM')).toBeInTheDocument();
    expect(screen.getByText('Oct 15, 3:05 PM')).toBeInTheDocument();
  });

  it('adds the comment a person wrote', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskComments comments={[]} currentUserId={ada.id} onAdd={onAdd} onDelete={async () => {}} />,
    );

    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Comment'), 'Check the carriage.');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(onAdd).toHaveBeenCalledWith('Check the carriage.');
  });

  it('does not add a blank comment', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskComments comments={[]} currentUserId={ada.id} onAdd={onAdd} onDelete={async () => {}} />,
    );

    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/comment is required/i);
  });

  it('lets someone delete only their own comment', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskComments
        comments={comments}
        currentUserId={ada.id}
        onAdd={async () => {}}
        onDelete={onDelete}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Delete your comment: I will sketch the mill tonight.' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Delete your comment: Feed the cards from the left.' }),
    );
    expect(onDelete).toHaveBeenCalledWith('c1');
  });
});
