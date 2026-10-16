import type { BoardId, Task, TaskId, TaskStatus } from "./domain.ts";

export type Move = {
  taskId: TaskId;
  status: TaskStatus;
  index: number;
};

const COLUMN_PREFIX = "column:";

export function columnDropId(status: TaskStatus): string {
  return `${COLUMN_PREFIX}${status}`;
}

function isStatus(value: string): value is TaskStatus {
  return value === "todo" || value === "doing" || value === "done";
}

function byPosition(a: Task, b: Task): number {
  return a.position - b.position || a.id.localeCompare(b.id);
}

export function tasksInColumn(tasks: readonly Task[], status: TaskStatus): Task[] {
  return tasks.filter((task) => task.status === status).slice().sort(byPosition);
}

function columnWithout(
  tasks: readonly Task[],
  boardId: BoardId,
  status: TaskStatus,
  except: TaskId,
): Task[] {
  return tasks
    .filter((task) => task.boardId === boardId && task.status === status && task.id !== except)
    .slice()
    .sort(byPosition);
}

export function applyMove(tasks: readonly Task[], move: Move): Task[] {
  const current = tasks.find((task) => task.id === move.taskId);
  if (!current) {
    throw new Error(`No task ${move.taskId}`);
  }
  const destination = columnWithout(tasks, current.boardId, move.status, current.id);
  const index = Math.min(move.index, destination.length);
  destination.splice(index, 0, { ...current, status: move.status });
  const placed = destination.map((task, position) => ({ ...task, position }));
  const rest = tasks.filter(
    (task) =>
      task.id !== current.id && !(task.boardId === current.boardId && task.status === move.status),
  );
  return [...rest, ...placed];
}

export function moveFromDrop(
  tasks: readonly Task[],
  movingId: string,
  overId: string,
): Move | null {
  const moving = tasks.find((task) => task.id === movingId);
  if (!moving || overId === moving.id) return null;

  if (overId.startsWith(COLUMN_PREFIX)) {
    const raw = overId.slice(COLUMN_PREFIX.length);
    if (!isStatus(raw)) return null;
    return {
      taskId: moving.id,
      status: raw,
      index: columnWithout(tasks, moving.boardId, raw, moving.id).length,
    };
  }

  const over = tasks.find((task) => task.id === overId);
  if (!over || over.boardId !== moving.boardId) return null;
  const destination = columnWithout(tasks, moving.boardId, over.status, moving.id);
  const found = destination.findIndex((task) => task.id === over.id);
  return {
    taskId: moving.id,
    status: over.status,
    index: found === -1 ? destination.length : found,
  };
}
