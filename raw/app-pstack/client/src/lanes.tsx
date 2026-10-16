import { useDroppable, useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import {
  STATUS_LABEL,
  TASK_STATUSES,
  columnDropId,
  initials,
  isOverdue,
  tasksInColumn,
} from "@plank/shared";
import type { PublicUser, Task, TaskStatus } from "@plank/shared";
import { Button } from "@/components/ui/button";

type BoardLanesProps = {
  tasks: readonly Task[];
  members: readonly PublicUser[];
  today: string;
  onOpen: (task: Task) => void;
  onAdd: (status: TaskStatus) => void;
};

export function BoardLanes({ tasks, members, today, onOpen, onAdd }: BoardLanesProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
      {TASK_STATUSES.map((status) => (
        <Lane
          key={status}
          status={status}
          tasks={tasksInColumn(tasks, status)}
          members={members}
          today={today}
          onOpen={onOpen}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}

function Lane({
  status,
  tasks,
  members,
  today,
  onOpen,
  onAdd,
}: {
  status: TaskStatus;
  tasks: readonly Task[];
  members: readonly PublicUser[];
  today: string;
  onOpen: (task: Task) => void;
  onAdd: (status: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(status) });
  return (
    <section
      ref={setNodeRef}
      aria-label={STATUS_LABEL[status]}
      className={`lane-${status} flex w-[min(100%,18rem)] shrink-0 flex-col gap-3 rounded-xl bg-card/80 p-3 ring-1 ring-border md:w-auto ${isOver ? "bg-accent" : ""}`}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg">
          {STATUS_LABEL[status]}
          <span className="ml-2 text-sm text-muted-foreground">{tasks.length}</span>
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={() => onAdd(status)}>
          Add task
        </Button>
      </header>
      {tasks.length === 0 ? (
        <p className="px-1 py-6 text-sm text-muted-foreground">Nothing in this lane.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              today={today}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
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
  members: readonly PublicUser[];
  today: string;
  onOpen: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: task.id });
  const assignee = task.assigneeId
    ? members.find((member) => member.id === task.assigneeId)
    : undefined;
  const overdue = isOverdue(task.dueDate, task.status, today);
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 }
    : undefined;

  return (
    <li ref={setDropRef} className={`rounded-lg ${isOver && !isDragging ? "ring-2 ring-primary" : ""}`}>
      <div
        ref={setDragRef}
        style={style}
        className={`rounded-lg bg-card p-3 ring-1 ring-border ${isDragging ? "opacity-70" : ""}`}
      >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 text-muted-foreground"
          aria-label={`Drag ${task.title}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical />
        </button>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(task)}>
          <h3 className="text-sm font-medium">{task.title}</h3>
          {task.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
          ) : null}
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {assignee ? (
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-foreground">
                  {initials(assignee.name)}
                </span>
                {assignee.name}
              </span>
            ) : (
              <span>Unassigned</span>
            )}
            {task.dueDate ? (
              <span className={overdue ? "overdue font-medium" : undefined}>
                {overdue ? "Overdue " : "Due "}
                {formatDue(task.dueDate)}
              </span>
            ) : null}
          </p>
        </button>
      </div>
      </div>
    </li>
  );
}

function formatDue(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
