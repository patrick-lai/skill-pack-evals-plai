import { z } from "zod";

const brandedId = <Brand extends string>() => z.string().uuid().brand<Brand>();

export const UserIdSchema = brandedId<"UserId">();
export type UserId = z.infer<typeof UserIdSchema>;

export const BoardIdSchema = brandedId<"BoardId">();
export type BoardId = z.infer<typeof BoardIdSchema>;

export const TaskIdSchema = brandedId<"TaskId">();
export type TaskId = z.infer<typeof TaskIdSchema>;

export const TaskStatusSchema = z.enum(["todo", "doing", "done"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TASK_STATUSES = TaskStatusSchema.options;

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  doing: "Doing",
  done: "Done",
};

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email.");

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-10-15.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === (month ?? 0) - 1 &&
      date.getUTCDate() === day
    );
  }, "Use a real calendar date.");

export const PublicUserSchema = z.object({
  id: UserIdSchema,
  email: emailSchema,
  name: z.string(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

export const BoardSchema = z.object({
  id: BoardIdSchema,
  name: z.string(),
  ownerId: UserIdSchema,
});
export type Board = z.infer<typeof BoardSchema>;

export const TaskSchema = z.object({
  id: TaskIdSchema,
  boardId: BoardIdSchema,
  title: z.string(),
  description: z.string(),
  status: TaskStatusSchema,
  assigneeId: UserIdSchema.nullable(),
  dueDate: calendarDate.nullable(),
  position: z.number().int().nonnegative(),
});
export type Task = z.infer<typeof TaskSchema>;

export const RegisterInputSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1, "Enter your name.").max(80, "Name is too long."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200, "Password is too long."),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(200),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const BoardNameSchema = z.object({
  name: z.string().trim().min(1, "Name the board.").max(80, "Board name is too long."),
});

export const MemberEmailSchema = z.object({
  email: emailSchema,
});

export const CreateTaskInputSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title.").max(140, "Title is too long."),
  description: z.string().trim().max(4000, "Description is too long.").default(""),
  status: TaskStatusSchema.default("todo"),
  assigneeId: UserIdSchema.nullable().default(null),
  dueDate: calendarDate.nullable().default(null),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const UpdateTaskInputSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title.").max(140, "Title is too long."),
  description: z.string().trim().max(4000, "Description is too long."),
  assigneeId: UserIdSchema.nullable(),
  dueDate: calendarDate.nullable(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;

export const MoveInputSchema = z.object({
  status: TaskStatusSchema,
  index: z.number().int().nonnegative(),
});
export type MoveInput = z.infer<typeof MoveInputSchema>;

export function newId<Schema extends z.ZodType<string>>(schema: Schema): z.infer<Schema> {
  return schema.parse(crypto.randomUUID());
}

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export function bodySetsStatus(body: unknown): boolean {
  return typeof body === "object" && body !== null && "status" in body;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function todayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isOverdue(dueDate: string | null, status: TaskStatus, today: string): boolean {
  return status !== "done" && dueDate !== null && dueDate < today;
}
