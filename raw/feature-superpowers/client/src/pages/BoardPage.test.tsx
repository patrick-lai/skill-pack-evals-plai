import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth';
import type { Comment, Task } from '../types';
import { BoardPage } from './BoardPage';

const ada = { id: 'user-ada', name: 'Ada Lovelace', email: 'ada@example.com' };

function task(id: string, title: string): Task {
  return {
    id,
    boardId: 'board-1',
    title,
    description: '',
    status: 'todo',
    assigneeId: null,
    assignee: null,
    dueDate: null,
    position: 0,
    commentCount: 0,
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  };
}

function comment(id: string, taskId: string, body: string): Comment {
  return {
    id,
    taskId,
    body,
    createdAt: '2026-10-15T23:38:00.000Z',
    author: ada,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('BoardPage comments', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ignores a comment response for a task that is no longer open', async () => {
    const user = userEvent.setup();
    let releaseFirst: (response: Response) => void = () => {};
    const firstComments = new Promise<Response>((resolve) => {
      releaseFirst = resolve;
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.endsWith('/api/auth/me')) return json({ user: ada });
        if (url.endsWith('/api/boards/board-1')) {
          return json({
            board: {
              id: 'board-1',
              name: 'Dock',
              description: '',
              ownerId: ada.id,
              role: 'owner',
              createdAt: '2026-10-15T00:00:00.000Z',
              updatedAt: '2026-10-15T00:00:00.000Z',
              counts: { todo: 2, doing: 0, done: 0 },
              members: [{ ...ada, role: 'owner' }],
              tasks: [task('task-a', 'Coil the line'), task('task-b', 'Write the notes')],
            },
          });
        }
        if (url.endsWith('/api/tasks/task-a/comments')) return firstComments;
        if (url.endsWith('/api/tasks/task-b/comments')) {
          return json({ comments: [comment('comment-b', 'task-b', 'Notes first.')] });
        }
        return json({ error: 'Not found' }, 404);
      }),
    );

    render(
      <MemoryRouter initialEntries={['/boards/board-1']}>
        <AuthProvider>
          <Routes>
            <Route path="/boards/:boardId" element={<BoardPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Edit Coil the line' }));
    expect(await screen.findByText('Loading comments…')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Edit Write the notes' }));
    expect(await screen.findByText('Notes first.')).toBeInTheDocument();

    await act(async () => {
      releaseFirst(json({ comments: [comment('comment-a', 'task-a', 'Stale warp.')] }));
    });
    expect(screen.queryByText('Stale warp.')).not.toBeInTheDocument();
    expect(screen.getByText('Notes first.')).toBeInTheDocument();
  });
});