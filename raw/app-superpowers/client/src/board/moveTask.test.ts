import { describe, expect, it } from 'vitest';
import type { Task } from '@boardline/shared';
import { moveTask, resolveDrop } from './moveTask';

function task(overrides: Partial<Task> & Pick<Task, 'id' | 'status' | 'position'>): Task {
  return {
    boardId: 'board',
    title: overrides.id,
    description: '',
    assigneeId: null,
    dueDate: null,
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
    ...overrides,
  };
}

const tasks = [
  task({ id: 'a', status: 'todo', position: 0 }),
  task({ id: 'b', status: 'todo', position: 1 }),
  task({ id: 'c', status: 'doing', position: 0 }),
];

describe('moveTask', () => {
  it('appends a task to the destination column and closes the source gap', () => {
    const next = moveTask(tasks, 'a', 'doing');
    expect(next.find((item) => item.id === 'b')).toMatchObject({ status: 'todo', position: 0 });
    expect(next.find((item) => item.id === 'c')).toMatchObject({ status: 'doing', position: 0 });
    expect(next.find((item) => item.id === 'a')).toMatchObject({ status: 'doing', position: 1 });
    expect(next).toHaveLength(3);
  });

  it('keeps a single copy of each card when the task stays in its column', () => {
    const next = moveTask(tasks, 'b', 'todo', 0);
    expect(next.filter((item) => item.id === 'a')).toHaveLength(1);
    expect(next.filter((item) => item.id === 'b')).toHaveLength(1);
    expect(next.filter((item) => item.id === 'c')).toHaveLength(1);
    expect(next.find((item) => item.id === 'b')).toMatchObject({ status: 'todo', position: 0 });
    expect(next.find((item) => item.id === 'a')).toMatchObject({ status: 'todo', position: 1 });
    expect(next.find((item) => item.id === 'c')).toMatchObject({ status: 'doing', position: 0 });
  });
});

describe('resolveDrop', () => {
  it('reads a column or a card as the destination status', () => {
    expect(resolveDrop(tasks, 'a', 'column:doing')).toEqual({ taskId: 'a', status: 'doing' });
    expect(resolveDrop(tasks, 'a', 'task:c')).toEqual({ taskId: 'a', status: 'doing' });
    expect(resolveDrop(tasks, 'a', null)).toBeNull();
  });
});
