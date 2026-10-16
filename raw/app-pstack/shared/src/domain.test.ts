import { describe, expect, it } from "vitest";
import {
  BoardIdSchema,
  CreateTaskInputSchema,
  RegisterInputSchema,
  TaskIdSchema,
  TaskStatusSchema,
  firstIssue,
  initials,
  isOverdue,
} from "./domain.ts";
import { applyMove, columnDropId, moveFromDrop } from "./move.ts";
import type { Task } from "./domain.ts";

const boardId = BoardIdSchema.parse("22222222-2222-4222-8222-222222222222");
const taskA = TaskIdSchema.parse("33333333-3333-4333-8333-333333333333");
const taskB = TaskIdSchema.parse("44444444-4444-4444-8444-444444444444");
const taskC = TaskIdSchema.parse("55555555-5555-4555-8555-555555555555");

function task(id: Task["id"], status: Task["status"], position: number, title: string): Task {
  return {
    id,
    boardId,
    title,
    description: "",
    status,
    assigneeId: null,
    dueDate: null,
    position,
  };
}

const board = [
  task(taskA, "todo", 0, "Write the brief"),
  task(taskB, "todo", 1, "Book the room"),
  task(taskC, "doing", 0, "Cut the trailer"),
];

describe("register input", () => {
  it("lowercases the email and rejects a short password", () => {
    const parsed = RegisterInputSchema.parse({
      email: " Ada@Example.com ",
      name: "Ada Lovelace",
      password: "correct horse",
    });
    expect(parsed.email).toBe("ada@example.com");

    const failure = RegisterInputSchema.safeParse({
      email: "ada@example.com",
      name: "Ada",
      password: "short",
    });
    expect(failure.success).toBe(false);
    if (!failure.success) {
      expect(firstIssue(failure.error)).toBe("Password must be at least 8 characters.");
    }
  });
});

describe("task order", () => {
  it("moves a task to the end of Doing", () => {
    const moved = applyMove(board, { taskId: taskA, status: "doing", index: 1 });
    const doing = moved
      .filter((item) => item.status === "doing")
      .sort((a, b) => a.position - b.position);
    expect(doing.map((item) => item.title)).toEqual(["Cut the trailer", "Write the brief"]);
    expect(doing.map((item) => item.position)).toEqual([0, 1]);
    expect(moved.find((item) => item.id === taskB)?.status).toBe("todo");
  });

  it("keeps the same order when the same move runs twice", () => {
    const move = { taskId: taskA, status: "doing" as const, index: 0 };
    const once = applyMove(board, move);
    const twice = applyMove(once, move);
    expect(twice.map((item) => [item.id, item.status, item.position]).sort()).toEqual(
      once.map((item) => [item.id, item.status, item.position]).sort(),
    );
  });

  it("reads a drop on a card as an insert-before", () => {
    const move = moveFromDrop(board, taskA, taskC);
    expect(move).toEqual({ taskId: taskA, status: "doing", index: 0 });
    const titles = applyMove(board, move!)
      .filter((item) => item.status === "doing")
      .sort((a, b) => a.position - b.position)
      .map((item) => item.title);
    expect(titles).toEqual(["Write the brief", "Cut the trailer"]);
  });

  it("reads a drop on a column as an append", () => {
    const move = moveFromDrop(board, taskA, columnDropId("done"));
    expect(move).toEqual({ taskId: taskA, status: "done", index: 0 });
  });

  it("ignores a drop on the card itself", () => {
    expect(moveFromDrop(board, taskA, taskA)).toBeNull();
  });
});

describe("due dates", () => {
  it("marks an open task overdue only after the due date", () => {
    expect(isOverdue("2026-10-14", "todo", "2026-10-15")).toBe(true);
    expect(isOverdue("2026-10-15", "doing", "2026-10-15")).toBe(false);
    expect(isOverdue("2026-10-14", "done", "2026-10-15")).toBe(false);
    expect(isOverdue(null, "todo", "2026-10-15")).toBe(false);
  });

  it("rejects a calendar date that does not exist", () => {
    const parsed = CreateTaskInputSchema.safeParse({
      title: "Ship",
      dueDate: "2026-02-31",
      status: TaskStatusSchema.enum.todo,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("initials", () => {
  it("uses the first letter of the first two words", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Ada")).toBe("A");
  });
});
