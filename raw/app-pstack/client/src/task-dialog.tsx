import { useState } from "react";
import type { FormEvent } from "react";
import { STATUS_LABEL, TASK_STATUSES } from "@plank/shared";
import type { PublicUser, Task, TaskStatus, UserId } from "@plank/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type TaskDraft =
  | { mode: "create"; status: TaskStatus }
  | { mode: "edit"; task: Task };

export type TaskSave = {
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: UserId | null;
  dueDate: string | null;
};

const UNASSIGNED = "none";

export function TaskDialog({
  draft,
  members,
  pending,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  draft: TaskDraft;
  members: readonly PublicUser[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: TaskSave) => void;
  onDelete: (() => void) | null;
}) {
  const initial = draft.mode === "edit" ? draft.task : null;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(
    initial?.status ?? (draft.mode === "create" ? draft.status : "todo"),
  );
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId ?? UNASSIGNED);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const member = members.find((person) => person.id === assigneeId);
    onSave({
      title,
      description,
      status,
      assigneeId: member ? member.id : null,
      dueDate: dueDate === "" ? null : dueDate,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{draft.mode === "create" ? "New task" : "Edit task"}</DialogTitle>
          <DialogDescription>
            {draft.mode === "create"
              ? `It starts in ${STATUS_LABEL[draft.status]}. Drag it later when the work moves.`
              : "Title, description, assignee, and due date save here. Status uses the same move as a drag."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                <SelectTrigger aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {STATUS_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger aria-label="Assignee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter className="sm:justify-between">
            {onDelete ? (
              <Button type="button" variant="destructive" onClick={onDelete} disabled={pending}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
