import { describe, expect, it } from 'vitest';
import { groupTasks, relocateTask } from './board';
import type { Status } from '../types';

function task(id: string, status: Status, position: number) {
  return { id, status, position };
}

describe('relocateTask', () => {
  it('moves a task to the end of another column', () => {
    const tasks = [task('a', 'todo', 0), task('b', 'doing', 0)];
    expect(relocateTask(tasks, 'a', 'column:doing')).toEqual([
      task('b', 'doing', 0),
      task('a', 'doing', 1),
    ]);
  });

  it('inserts before the card it is dropped on', () => {
    const tasks = [task('a', 'todo', 0), task('b', 'doing', 0), task('c', 'doing', 1)];
    const next = relocateTask(tasks, 'a', 'c');
    expect(next?.filter((item) => item.status === 'doing').map((item) => item.id)).toEqual(['b', 'a', 'c']);
    expect(next?.find((item) => item.id === 'a')?.position).toBe(1);
  });

  it('reorders inside a column with array-move semantics', () => {
    const tasks = [task('a', 'todo', 0), task('b', 'todo', 1), task('c', 'todo', 2)];
    const next = relocateTask(tasks, 'c', 'a');
    expect(next?.map((item) => item.id)).toEqual(['c', 'a', 'b']);
    expect(next?.map((item) => item.position)).toEqual([0, 1, 2]);

    const downward = relocateTask(tasks, 'a', 'c');
    expect(downward?.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('leaves a task alone when it is dropped on its own column', () => {
    const tasks = [task('a', 'todo', 0), task('b', 'doing', 0)];
    expect(relocateTask(tasks, 'a', 'column:todo')).toBe(tasks);
  });

  it('groups tasks by status and position', () => {
    const grouped = groupTasks([
      task('b', 'todo', 1),
      task('a', 'todo', 0),
      task('c', 'done', 0),
    ]);
    expect(grouped.todo.map((item) => item.id)).toEqual(['a', 'b']);
    expect(grouped.doing).toEqual([]);
    expect(grouped.done.map((item) => item.id)).toEqual(['c']);
  });
});
