import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { GripVertical, Plus } from 'lucide-react'
import { dropTarget, type Member, type Status, type Task } from '@bench/shared'
import { Button } from '@/components/ui/button'
import { COLUMNS, columnTasks } from '@/components/columns'
import { dueLabel } from '@/lib/format'

interface BoardColumnsProps {
  tasks: Task[]
  members: Member[]
  truncated: boolean
  onMove: (taskId: string, status: Status, index: number) => void
  onOpen: (task: Task) => void
  onCreate: (status: Status) => void
}

export function BoardColumns({ tasks, members, truncated, onMove, onOpen, onCreate }: BoardColumnsProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const dragging = tasks.find((task) => task.id === activeId)

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    if (!event.over) return
    const target = dropTarget(tasks, String(event.active.id), String(event.over.id))
    if (!target) return
    onMove(String(event.active.id), target.status, target.index)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event) => setActiveId(String(event.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={onDragEnd}
    >
      <p className="sr-only">Drag a card by its handle, or use Move on the card to change its column.</p>
      {truncated ? (
        <p role="status" className="mb-3 text-sm text-muted-foreground">
          Showing the first 200 tasks. Split the board if it grows past that.
        </p>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {COLUMNS.map((column) => (
          <Column
            key={column.status}
            status={column.status}
            title={column.title}
            detail={column.detail}
            tasks={columnTasks(tasks, column.status)}
            allTasks={tasks}
            members={members}
            onMove={onMove}
            onOpen={onOpen}
            onCreate={onCreate}
          />
        ))}
      </div>
      <DragOverlay>
        {dragging ? (
          <div className="border border-border bg-card px-3 py-2 text-sm font-semibold shadow-none">{dragging.title}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function Column({
  status,
  title,
  detail,
  tasks,
  allTasks,
  members,
  onMove,
  onOpen,
  onCreate,
}: {
  status: Status
  title: string
  detail: string
  tasks: Task[]
  allTasks: Task[]
  members: Member[]
  onMove: BoardColumnsProps['onMove']
  onOpen: BoardColumnsProps['onOpen']
  onCreate: BoardColumnsProps['onCreate']
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` })
  const wash = status === 'todo' ? 'bg-todo' : status === 'doing' ? 'bg-doing' : 'bg-done'

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`column-${status}`}
      className={`border border-border p-3 ${wash} ${isOver ? 'outline outline-2 outline-foreground' : ''}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 id={`column-${status}`} className="font-display text-2xl font-medium">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {detail} · {tasks.length === 1 ? '1 task' : `${tasks.length} tasks`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onCreate(status)} aria-label={`Add a task to ${title}`}>
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-40 flex-col gap-2">
          {tasks.length === 0 ? <p className="px-1 py-6 text-sm text-muted-foreground">Nothing here yet.</p> : null}
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} members={members} tasks={allTasks} onMove={onMove} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}

function TaskCard({
  task,
  members,
  tasks,
  onMove,
  onOpen,
}: {
  task: Task
  members: Member[]
  tasks: Task[]
  onMove: BoardColumnsProps['onMove']
  onOpen: (task: Task) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const assignee = members.find((member) => member.id === task.assigneeId)

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`border border-border bg-card p-3 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Drag ${task.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <button type="button" className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onOpen(task)}>
          <span className="block font-semibold leading-snug">{task.title}</span>
          {task.description ? <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{task.description}</span> : null}
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">
          {assignee ? assignee.name : 'Unassigned'}
        </span>
        <span className={task.dueDate && task.status !== 'done' && task.dueDate < new Date().toISOString().slice(0, 10) ? 'font-semibold' : 'text-muted-foreground'}>
          {dueLabel(task.dueDate, task.status)}
        </span>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        Move
        <select
          aria-label={`Move ${task.title}`}
          className="h-8 flex-1 border border-border bg-card px-2 text-foreground"
          value={task.status}
          onChange={(event) => {
            const status = event.target.value as Status
            const index = tasks.filter((item) => item.status === status && item.id !== task.id).length
            onMove(task.id, status, index)
          }}
        >
          <option value="todo">To do</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
        </select>
      </label>
    </article>
  )
}
