import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Member, Task, TaskStatus } from '@boardline/shared';
import { assigneeLabel, formatDue, isOverdue, resolveDrop } from './moveTask';

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: 'todo', label: 'Todo' },
  { status: 'doing', label: 'Doing' },
  { status: 'done', label: 'Done' },
];

export function Kanban({
  tasks,
  members,
  today,
  onOpen,
  onMove,
}: {
  tasks: Task[];
  members: Member[];
  today: string;
  onOpen: (task: Task) => void;
  onMove: (taskId: string, status: TaskStatus, position?: number) => void;
}) {
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    setOverId(null);
    const activeId = String(event.active.id).replace(/^task:/, '');
    const over = event.over ? String(event.over.id) : null;
    const drop = resolveDrop(tasks, activeId, over);
    if (!drop) return;
    const current = tasks.find((task) => task.id === drop.taskId);
    if (!current) return;
    if (over?.startsWith('task:')) {
      const target = tasks.find((task) => task.id === over.slice('task:'.length));
      if (!target || target.id === current.id) return;
      onMove(drop.taskId, drop.status, target.position);
      return;
    }
    if (current.status === drop.status) return;
    onMove(drop.taskId, drop.status);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragOver={(event) => setOverId(event.over ? String(event.over.id) : null)}
      onDragCancel={() => setOverId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban">
        {COLUMNS.map((column) => (
          <Column
            key={column.status}
            status={column.status}
            label={column.label}
            tasks={tasks.filter((task) => task.status === column.status).sort((a, b) => a.position - b.position)}
            members={members}
            today={today}
            hot={columnIsHot(tasks, column.status, overId)}
            onOpen={onOpen}
          />
        ))}
      </div>
    </DndContext>
  );
}

function columnIsHot(tasks: Task[], status: TaskStatus, overId: string | null): boolean {
  if (!overId) return false;
  if (overId === `column:${status}`) return true;
  if (overId.startsWith('task:')) {
    return tasks.find((task) => task.id === overId.slice('task:'.length))?.status === status;
  }
  return false;
}

function Column({
  status,
  label,
  tasks,
  members,
  today,
  hot,
  onOpen,
}: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  members: Member[];
  today: string;
  hot: boolean;
  onOpen: (task: Task) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `column:${status}` });
  return (
    <section ref={setNodeRef} className={`column column-${status}${hot ? ' is-over' : ''}`} aria-label={label}>
      <header className="column-head">
        <h2>{label}</h2>
        <span>{tasks.length}</span>
      </header>
      <div className="column-body">
        {tasks.length === 0 ? <p className="empty-column">Nothing here</p> : null}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} members={members} today={today} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function TaskCard({
  task,
  members,
  today,
  onOpen,
}: {
  task: Task;
  members: Member[];
  today: string;
  onOpen: (task: Task) => void;
}) {
  const draggable = useDraggable({ id: `task:${task.id}` });
  const droppable = useDroppable({ id: `task:${task.id}`, disabled: draggable.isDragging });
  const overdue = isOverdue(task.dueDate, task.status, today);
  return (
    <article
      ref={(node) => {
        draggable.setNodeRef(node);
        droppable.setNodeRef(node);
      }}
      className={`card${draggable.isDragging ? ' is-dragging' : ''}`}
      data-overdue={overdue ? 'true' : 'false'}
      style={{ transform: draggable.transform ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)` : undefined }}
    >
      <div className="card-top">
        <button className="card-title" type="button" onClick={() => onOpen(task)}>
          {task.title}
        </button>
        <span className="drag-handle" aria-label={`Drag ${task.title}`} {...draggable.attributes} {...draggable.listeners} />
      </div>
      <p className="card-meta">
        <span>{assigneeLabel(task, members)}</span>
        {task.dueDate ? <span className={overdue ? 'due overdue' : 'due'}>{formatDue(task.dueDate)}</span> : null}
      </p>
    </article>
  );
}
