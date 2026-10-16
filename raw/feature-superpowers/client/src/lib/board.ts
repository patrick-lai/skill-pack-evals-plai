import type { Status, Task } from '../types';

export const STATUSES = ['todo', 'doing', 'done'] as const;

export const STATUS_META: Record<Status, { label: string; hint: string }> = {
  todo: { label: 'To do', hint: 'Not started' },
  doing: { label: 'Doing', hint: 'In progress' },
  done: { label: 'Done', hint: 'Finished' },
};

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export function columnId(status: Status): string {
  return `column:${status}`;
}

type Placed = {
  id: string;
  status: Status;
  position: number;
};

export function groupTasks<T extends Placed>(tasks: T[]): Record<Status, T[]> {
  const grouped: Record<Status, T[]> = { todo: [], doing: [], done: [] };
  for (const status of STATUSES) {
    grouped[status] = tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  }
  return grouped;
}

function reindex<T extends Placed>(grouped: Record<Status, T[]>): T[] {
  return STATUSES.flatMap((status) =>
    grouped[status].map((task, position) => ({ ...task, status, position })),
  );
}

export function relocateTask<T extends Placed>(tasks: T[], activeId: string, overId: string): T[] | null {
  if (activeId === overId) return tasks;
  const grouped = groupTasks(tasks);
  const from = STATUSES.find((status) => grouped[status].some((task) => task.id === activeId));
  if (!from) return null;
  const fromIndex = grouped[from].findIndex((task) => task.id === activeId);
  const active = grouped[from][fromIndex];
  if (!active) return null;

  if (overId.startsWith('column:')) {
    const status = overId.slice('column:'.length);
    if (!isStatus(status) || status === from) return tasks;
    const source = grouped[from].filter((task) => task.id !== activeId);
    const dest = grouped[status].slice();
    dest.push({ ...active, status });
    return reindex({ ...grouped, [from]: source, [status]: dest });
  }

  const to = STATUSES.find((status) => grouped[status].some((task) => task.id === overId));
  if (!to) return null;
  const overIndex = grouped[to].findIndex((task) => task.id === overId);
  if (from === to) {
    if (fromIndex === overIndex) return tasks;
    const copy = grouped[from].slice();
    const [item] = copy.splice(fromIndex, 1);
    if (!item) return tasks;
    copy.splice(overIndex, 0, item);
    return reindex({ ...grouped, [from]: copy });
  }

  const source = grouped[from].filter((task) => task.id !== activeId);
  const dest = grouped[to].slice();
  dest.splice(overIndex, 0, { ...active, status: to });
  return reindex({ ...grouped, [from]: source, [to]: dest });
}

export function statusForTarget(tasks: Pick<Task, 'id' | 'status'>[], overId: string | null): Status | null {
  if (!overId) return null;
  if (overId.startsWith('column:')) {
    const status = overId.slice('column:'.length);
    return isStatus(status) ? status : null;
  }
  return tasks.find((task) => task.id === overId)?.status ?? null;
}
