import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { BoardColumns } from './BoardColumns';

function task(id: string, title: string, status: Task['status'], commentCount = 0): Task {
  return {
    id,
    boardId: 'board-1',
    title,
    description: '',
    status,
    assigneeId: null,
    assignee: null,
    dueDate: null,
    position: 0,
    commentCount,
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  };
}

describe('BoardColumns', () => {
  it('places each task under its status', () => {
    render(
      <BoardColumns
        tasks={[task('a', 'Sketch', 'todo'), task('b', 'Write', 'doing'), task('c', 'Ship', 'done')]}
        onMove={() => {}}
        onOpen={() => {}}
      />,
    );

    expect(screen.getByTestId('column-todo')).toHaveTextContent('Sketch');
    expect(screen.getByTestId('column-doing')).toHaveTextContent('Write');
    expect(screen.getByTestId('column-done')).toHaveTextContent('Ship');
    expect(screen.getByRole('heading', { name: 'To do' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Doing' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument();
  });

  it('shows a comment count on the card in its column', () => {
    render(
      <BoardColumns
        tasks={[task('a', 'Sketch', 'todo', 3)]}
        onMove={() => {}}
        onOpen={() => {}}
      />,
    );

    expect(screen.getByTestId('column-todo')).toHaveTextContent('3 comments');
    expect(screen.getByRole('heading', { name: 'To do' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Doing' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument();
  });
});
