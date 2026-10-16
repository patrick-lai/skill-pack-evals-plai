import type { Status } from '@bench/shared'

export const COLUMNS: Array<{ status: Status; title: string; detail: string }> = [
  { status: 'todo', title: 'To do', detail: 'Not started' },
  { status: 'doing', title: 'Doing', detail: 'In progress' },
  { status: 'done', title: 'Done', detail: 'Finished' },
]

export function columnTasks<T extends { status: Status; position: number; id: string }>(tasks: T[], status: Status): T[] {
  return tasks.filter((task) => task.status === status).sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
}
