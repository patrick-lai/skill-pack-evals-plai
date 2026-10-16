import { z } from 'zod'

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

const email = z.string().trim().toLowerCase().email().max(200)
const dueDate = z.string().refine(isCalendarDate, 'Use a real calendar date.')

export const registerSchema = z.object({
  email,
  name: z.string().trim().min(1).max(80),
  password: z.string().min(8, 'Use at least 8 characters.').max(200),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200),
})

export const boardNameSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

export const inviteSchema = z.object({
  email,
})

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().max(5000).optional().default(''),
  status: z.enum(['todo', 'doing', 'done']).optional().default('todo'),
  assigneeId: z.string().uuid().nullable().optional().default(null),
  dueDate: dueDate.nullable().optional().default(null),
})

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(140).optional(),
    description: z.string().max(5000).optional(),
    status: z.enum(['todo', 'doing', 'done']).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    dueDate: dueDate.nullable().optional(),
    position: z.number().int().min(0).max(10000).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'Provide at least one field to change.',
  })

export const pageSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
})
