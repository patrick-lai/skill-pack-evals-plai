import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Board } from "@plank/shared";
import { api, ApiError } from "./api.ts";
import { useSession } from "./session.tsx";
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

export function BoardsPage() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function load() {
    setError(null);
    api<{ boards: Board[] }>("/api/boards")
      .then((data) => setBoards(data.boards))
      .catch((caught: unknown) => {
        setBoards([]);
        setError(caught instanceof ApiError ? caught.message : "Could not load boards.");
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function createBoard() {
    setPending(true);
    setCreateError(null);
    try {
      const data = await api<{ board: Board }>("/api/boards", { body: { name } });
      navigate(`/boards/${data.board.id}`);
    } catch (caught) {
      setCreateError(caught instanceof ApiError ? caught.message : "Could not create the board.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Shell name={user?.name ?? ""} onLogout={() => void logout()}>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl">Boards</h1>
          <p className="mt-1 text-sm text-muted-foreground">Each board is three lanes your team shares.</p>
        </div>
        <Button type="button" onClick={() => { setCreating(true); setName(""); setCreateError(null); }}>
          New board
        </Button>
      </div>
      {boards === null ? <p>Loading your boards.</p> : null}
      {error ? (
        <div className="rounded-xl bg-card p-4 ring-1 ring-border">
          <p role="alert">{error}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={load}>
            Try again
          </Button>
        </div>
      ) : null}
      {boards && boards.length === 0 && !error ? (
        <div className="rounded-xl bg-card p-6 ring-1 ring-border">
          <p>No boards yet. Create one and the three lanes are ready.</p>
        </div>
      ) : null}
      {boards && boards.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {boards.map((board) => (
            <li key={board.id}>
              <Link
                to={`/boards/${board.id}`}
                className="block rounded-xl bg-card p-4 ring-1 ring-border hover:ring-primary"
              >
                <span className="font-heading text-2xl">{board.name}</span>
                <span className="mt-2 block text-sm text-muted-foreground">Open board</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New board</DialogTitle>
            <DialogDescription>Name it after the work, not the team.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="board-name">Board name</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createBoard();
              }}
            />
          </div>
          {createError ? <p role="alert" className="text-sm text-destructive">{createError}</p> : null}
          <DialogFooter>
            <Button type="button" onClick={() => void createBoard()} disabled={pending}>
              {pending ? "Creating…" : "Create board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

export function Shell({
  name,
  onLogout,
  children,
}: {
  name: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto min-h-svh max-w-6xl px-4 py-5">
      <header className="mb-8 flex items-center justify-between gap-3">
        <Link to="/" className="font-heading text-2xl tracking-tight">
          Plank
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span>{name}</span>
          <Button type="button" variant="ghost" onClick={onLogout}>
            Sign out
          </Button>
        </div>
      </header>
      {children}
    </div>
  );
}
