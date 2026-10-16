import type { Member, Task, TaskStatus } from '@boardline/shared';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function moveTask(tasks: Task[], taskId: string, toStatus: TaskStatus, toIndex?: number): Task[] {
  const moving = tasks.find((task) => task.id === taskId);
  if (!moving) return tasks;
  const others = tasks.filter((task) => task.status !== moving.status && task.status !== toStatus);
  const source =
    moving.status === toStatus
      ? []
      : tasks
          .filter((task) => task.status === moving.status && task.id !== taskId)
          .sort((a, b) => a.position - b.position)
          .map((task, index) => ({ ...task, position: index }));
  const destination = tasks
    .filter((task) => task.status === toStatus && task.id !== taskId)
    .sort((a, b) => a.position - b.position);
  const index = toIndex == null ? destination.length : Math.max(0, Math.min(toIndex, destination.length));
  const placed = [...destination];
  placed.splice(index, 0, { ...moving, status: toStatus });
  return [...others, ...source, ...placed.map((task, position) => ({ ...task, position }))];
}

export function resolveDrop(
  tasks: Task[],
  activeId: string,
  overId: string | null,
): { taskId: string; status: TaskStatus } | null {
  if (!overId || !tasks.some((task) => task.id === activeId)) return null;
  if (overId.startsWith('column:')) {
    const status = overId.slice('column:'.length);
    if (status === 'todo' || status === 'doing' || status === 'done') return { taskId: activeId, status };
    return null;
  }
  if (overId.startsWith('task:')) {
    const over = tasks.find((task) => task.id === overId.slice('task:'.length));
    if (!over) return null;
    return { taskId: activeId, status: over.status };
  }
  return null;
}

export function isOverdue(dueDate: string | null, status: TaskStatus, today: string): boolean {
  if (!dueDate || status === 'done') return false;
  return dueDate < today;
}

export function formatDue(dueDate: string): string {
  const [, month, day] = dueDate.split('-');
  return `Due ${MONTHS[Number(month) - 1]} ${Number(day)}`;
}

export function assigneeLabel(task: Task, members: Member[]): string {
  if (!task.assigneeId) return 'Unassigned';
  const member = members.find((item) => item.id === task.assigneeId);
  if (!member) return 'Unassigned';
  const [first] = member.name.trim().split(/\s+/);
  return first || 'Unassigned';
}

export function todayISO(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
