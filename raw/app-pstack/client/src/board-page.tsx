import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  applyMove,
  emailSchema,
  firstIssue,
  tasksInColumn,
} from "@plank/shared";
import type { Board, PublicUser, Task, TaskStatus } from "@plank/shared";
import { moveFromDrop } from "@plank/shared";
import { api, ApiError } from "./api.ts";
import { BoardLanes } from "./lanes.tsx";
import { Shell } from "./boards-page.tsx";
import { useSession } from "./session.tsx";
import { TaskDialog } from "./task-dialog.tsx";
import type { TaskDraft, TaskSave } from "./task-dialog.tsx";
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

type BoardPayload = {
  board: Board;
  members: PublicUser[];
  tasks: Task[];
};

export function BoardPage() {
  const { boardId = "" } = useParams();
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const [data, setData] = useState<BoardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const busy = useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  function load(silent: boolean) {
    if (!silent) setError(null);
    api<BoardPayload>(`/api/boards/${boardId}`)
      .then((payload) => {
        if (busy.current === 0) {
          setData(payload);
          setError(null);
          setRefreshNote(null);
        }
      })
      .catch((caught: unknown) => {
        const message = caught instanceof ApiError ? caught.message : "Could not load this board.";
        if (silent) setRefreshNote(message);
        else {
          setData(null);
          setError(message);
        }
      });
  }

  useEffect(() => {
    load(false);
  }, [boardId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (busy.current === 0 && draft === null) load(true);
    }, 8000);
    return () => clearInterval(timer);
  }, [boardId, draft]);

  async function withBusy(run: () => Promise<void>) {
    busy.current += 1;
    setPending(true);
    try {
      await run();
    } finally {
      busy.current -= 1;
      setPending(false);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    if (!data || event.over === null) return;
    const move = moveFromDrop(data.tasks, String(event.active.id), String(event.over.id));
    if (!move) return;
    const previous = data.tasks;
    setData({ ...data, tasks: applyMove(data.tasks, move) });
    void withBusy(async () => {
      try {
        const result = await api<{ tasks: Task[] }>(`/api/tasks/${move.taskId}/move`, {
          method: "POST",
          body: { status: move.status, index: move.index },
        });
        setData((current) => (current ? { ...current, tasks: result.tasks } : current));
      } catch (caught) {
        setData((current) => (current ? { ...current, tasks: previous } : current));
        setRefreshNote(caught instanceof ApiError ? caught.message : "Could not move that task.");
      }
    });
  }

  async function saveTask(input: TaskSave) {
    if (!draft || !data) return;
    setDialogError(null);
    await withBusy(async () => {
      try {
        if (draft.mode === "create") {
          const created = await api<{ task: Task }>(`/api/boards/${data.board.id}/tasks`, {
            body: input,
          });
          setData((current) =>
            current ? { ...current, tasks: [...current.tasks, created.task] } : current,
          );
        } else {
          const updated = await api<{ task: Task }>(`/api/tasks/${draft.task.id}`, {
            method: "PATCH",
            body: {
              title: input.title,
              description: input.description,
              assigneeId: input.assigneeId,
              dueDate: input.dueDate,
            },
          });
          if (input.status !== draft.task.status) {
            const destination = tasksInColumn(
              data.tasks.filter((task) => task.id !== draft.task.id),
              input.status,
            );
            const moved = await api<{ tasks: Task[] }>(`/api/tasks/${draft.task.id}/move`, {
              method: "POST",
              body: { status: input.status, index: destination.length },
            });
            setData((current) => (current ? { ...current, tasks: moved.tasks } : current));
          } else {
            setData((current) =>
              current
                ? {
                    ...current,
                    tasks: current.tasks.map((task) =>
                      task.id === updated.task.id ? updated.task : task,
                    ),
                  }
                : current,
            );
          }
        }
        setDraft(null);
      } catch (caught) {
        setDialogError(caught instanceof ApiError ? caught.message : "Could not save the task.");
      }
    });
  }

  async function deleteTask() {
    if (!draft || draft.mode !== "edit") return;
    setDialogError(null);
    await withBusy(async () => {
      try {
        await api(`/api/tasks/${draft.task.id}`, { method: "DELETE" });
        setData((current) =>
          current
            ? { ...current, tasks: current.tasks.filter((task) => task.id !== draft.task.id) }
            : current,
        );
        setDraft(null);
      } catch (caught) {
        setDialogError(caught instanceof ApiError ? caught.message : "Could not delete the task.");
      }
    });
  }

  async function invite() {
    if (!data) return;
    const parsed = emailSchema.safeParse(inviteEmail);
    if (!parsed.success) {
      setInviteError(firstIssue(parsed.error));
      return;
    }
    setInviteError(null);
    await withBusy(async () => {
      try {
        const result = await api<{ members: PublicUser[] }>(`/api/boards/${data.board.id}/members`, {
          body: { email: parsed.data },
        });
        setData((current) => (current ? { ...current, members: result.members } : current));
        setInviteEmail("");
      } catch (caught) {
        setInviteError(caught instanceof ApiError ? caught.message : "Could not add that person.");
      }
    });
  }

  async function removeBoard() {
    if (!data) return;
    await withBusy(async () => {
      await api(`/api/boards/${data.board.id}`, { method: "DELETE" });
      navigate("/");
    });
  }

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <Shell name={user?.name ?? ""} onLogout={() => void logout()}>
      {data === null && error === null ? <p>Loading this board.</p> : null}
      {error ? (
        <div className="rounded-xl bg-card p-4 ring-1 ring-border">
          <p role="alert">{error}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => load(false)}>
            Try again
          </Button>
          <p className="mt-3 text-sm">
            <Link to="/" className="underline">Back to boards</Link>
          </p>
        </div>
      ) : null}
      {data ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-heading text-4xl">{data.board.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.members.map((member) => member.name).join(", ")}
              </p>
            </div>
            {user?.id === data.board.ownerId ? (
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(true)}>
                Delete board
              </Button>
            ) : null}
          </div>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              void invite();
            }}
          >
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="invite-email">Add a teammate</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="name@team.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={pending}>
              Add
            </Button>
          </form>
          {inviteError ? <p role="alert" className="text-sm text-destructive">{inviteError}</p> : null}
          {refreshNote ? <p className="text-sm text-destructive">{refreshNote}</p> : null}
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
            <BoardLanes
              tasks={data.tasks}
              members={data.members}
              today={todayIso}
              onOpen={(task) => {
                setDialogError(null);
                setDraft({ mode: "edit", task });
              }}
              onAdd={(status: TaskStatus) => {
                setDialogError(null);
                setDraft({ mode: "create", status });
              }}
            />
          </DndContext>
        </div>
      ) : null}
      {draft ? (
        <TaskDialog
          key={draft.mode === "edit" ? draft.task.id : `new-${draft.status}`}
          draft={draft}
          members={data?.members ?? []}
          pending={pending}
          error={dialogError}
          onClose={() => setDraft(null)}
          onSave={(input) => void saveTask(input)}
          onDelete={draft.mode === "edit" ? () => void deleteTask() : null}
        />
      ) : null}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this board?</DialogTitle>
            <DialogDescription>Tasks on {data?.board.name ?? "this board"} go with it.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="destructive" onClick={() => void removeBoard()} disabled={pending}>
              Delete board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
