import { DndContext } from "@dnd-kit/core";
import { render, screen } from "@testing-library/react";
import { BoardIdSchema, TaskIdSchema, UserIdSchema } from "@plank/shared";
import type { PublicUser, Task } from "@plank/shared";
import { expect, it } from "vitest";
import { BoardLanes } from "./lanes.tsx";

const boardId = BoardIdSchema.parse("22222222-2222-4222-8222-222222222222");
const ada = UserIdSchema.parse("11111111-1111-4111-8111-111111111111");

const members: PublicUser[] = [
  { id: ada, email: "ada@example.com", name: "Ada Lovelace" },
];

function task(id: string, status: Task["status"], title: string, dueDate: string | null): Task {
  return {
    id: TaskIdSchema.parse(id),
    boardId,
    title,
    description: status === "doing" ? "Rough cut on the desk." : "",
    status,
    assigneeId: status === "todo" ? ada : null,
    dueDate,
    position: 0,
  };
}

it("places each task in its lane and marks an overdue date", () => {
  render(
    <DndContext>
      <BoardLanes
        tasks={[
          task("33333333-3333-4333-8333-333333333333", "todo", "Write the brief", "2026-10-14"),
          task("44444444-4444-4444-8444-444444444444", "doing", "Cut the trailer", null),
        ]}
        members={members}
        today="2026-10-15"
        onOpen={() => {}}
        onAdd={() => {}}
      />
    </DndContext>,
  );

  const todo = screen.getByRole("region", { name: "To do" });
  const doing = screen.getByRole("region", { name: "Doing" });
  const done = screen.getByRole("region", { name: "Done" });

  expect(todo.textContent).toContain("Write the brief");
  expect(todo.textContent).toContain("Ada Lovelace");
  expect(todo.textContent).toContain("Overdue");
  expect(todo.textContent).not.toContain("Cut the trailer");
  expect(doing.textContent).toContain("Cut the trailer");
  expect(doing.textContent).toContain("Rough cut on the desk.");
  expect(done.textContent).toContain("Nothing in this lane.");
});
