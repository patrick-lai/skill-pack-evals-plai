import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Member, Task } from '../types';
import { TaskDialog } from './TaskDialog';

const task: Task = {
  id: 'task-1',
  boardId: 'board-1',
  title: 'Write the brief',
  description: 'Cover the audience and the date.',
  status: 'todo',
  assigneeId: 'user-1',
  assignee: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
  dueDate: null,
  position: 0,
  commentCount: 0,
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
};

const members: Member[] = [
  { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'owner' },
];

function renderDialog(current: Task | null, onSave = vi.fn()) {
  render(
    <TaskDialog
      open
      onOpenChange={() => {}}
      task={current}
      members={members}
      currentUserId="user-1"
      onSave={onSave}
      onCommentCount={() => {}}
    />,
  );
  return onSave;
}

describe('TaskDialog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not offer comments while creating a task', () => {
    renderDialog(null);
    expect(screen.getByRole('heading', { name: 'New task' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Comments' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add comment' })).not.toBeInTheDocument();
  });

  it('saves a new task from the button outside the form', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderDialog(null, onSave);

    await user.type(screen.getByLabelText('Title'), 'Sketch the mill');
    await user.click(screen.getByRole('button', { name: 'Save task' }));

    expect(onSave).toHaveBeenCalledWith({
      title: 'Sketch the mill',
      description: '',
      status: 'todo',
      assigneeId: null,
      dueDate: null,
    });
    expect(screen.getByLabelText('Title')).toHaveValue('Sketch the mill');
  });

  it('adds a comment without saving the task', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === '/api/tasks/task-1/comments' && init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              comment: {
                id: 'comment-1',
                body: 'Ship the notes',
                createdAt: '2026-10-15T12:00:00.000Z',
                author: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
              },
            }),
            { status: 201, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(JSON.stringify({ comments: [] }), { status: 200 });
      }),
    );

    const user = userEvent.setup();
    const onSave = renderDialog(task);

    const title = await screen.findByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Write the brief today');
    await user.type(await screen.findByLabelText('Comment'), 'Ship the notes');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    expect(await screen.findByText('Ship the notes')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Write the brief today');
    expect(screen.getByRole('heading', { name: 'Edit task' })).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
