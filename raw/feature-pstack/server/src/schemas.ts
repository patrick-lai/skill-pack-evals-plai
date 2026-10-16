import { z } from 'zod';

const STATUSES = ['todo', 'doing', 'done'] as const;

export function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const dueDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a due date in YYYY-MM-DD')
  .refine(isRealDate, 'That due date is not a real day')
  .nullable();

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name is too long'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .max(200, 'Email is too long')
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(200, 'Password is too long'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

export const boardSchema = z.object({
  name: z.string().trim().min(1, 'Board name is required').max(80, 'Board name is too long'),
  description: z.string().trim().max(500, 'Description is too long').optional(),
});

export const boardPatchSchema = z
  .object({
    name: z.string().trim().min(1, 'Board name is required').max(80, 'Board name is too long'),
    description: z.string().trim().max(500, 'Description is too long'),
  })
  .partial()
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: 'Nothing to update',
  });

export const memberSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .transform((value) => value.toLowerCase()),
});

const taskFields = {
  title: z.string().trim().min(1, 'Title is required').max(160, 'Title is too long'),
  description: z.string().trim().max(5000, 'Description is too long'),
  status: z.enum(STATUSES),
  assigneeId: z.string().min(1).nullable(),
  dueDate,
};

export const taskCreateSchema = z.object({
  title: taskFields.title,
  description: taskFields.description.optional(),
  status: taskFields.status.optional(),
  assigneeId: taskFields.assigneeId.optional(),
  dueDate: taskFields.dueDate.optional(),
});

export const taskPatchSchema = z
  .object({
    title: taskFields.title.optional(),
    description: taskFields.description.optional(),
    status: taskFields.status.optional(),
    assigneeId: taskFields.assigneeId.optional(),
    dueDate: taskFields.dueDate.optional(),
    position: z.number().int().min(0, 'Position cannot be negative').optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

export const commentCreateSchema = z.object({
  body: z.string().trim().min(1, 'Comment is required').max(2000, 'Comment is too long'),
});
