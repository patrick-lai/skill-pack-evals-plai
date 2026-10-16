import type { BoardDetail, BoardSummary, Member, Page, Status, Task, User } from '@bench/shared'

interface FieldDetails {
  formErrors?: string[]
  fieldErrors?: Record<string, string[] | undefined>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: FieldDetails

  constructor(status: number, code: string, message: string, details?: FieldDetails) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function fieldMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong.'
  const fields = error.details?.fieldErrors
  if (fields) {
    for (const [key, messages] of Object.entries(fields)) {
      if (messages && messages.length > 0) return `${fieldLabel(key)}: ${messages[0]}`
    }
  }
  const form = error.details?.formErrors?.find(Boolean)
  if (form) return form
  return error.message
}

function fieldLabel(key: string): string {
  if (key === 'dueDate') return 'Due date'
  if (key === 'assigneeId') return 'Assignee'
  return key.charAt(0).toUpperCase() + key.slice(1)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'NETWORK', "Can't reach the server. Check that it is running.")
  }

  if (response.status === 204) return undefined as T
  const body = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string; details?: FieldDetails }
  } | null
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'REQUEST_FAILED',
      body?.error?.message ?? 'Request failed.',
      body?.error?.details,
    )
  }
  return body as T
}

export function getMe(): Promise<{ user: User }> {
  return request('/api/auth/me')
}

export function registerAccount(input: { email: string; name: string; password: string }): Promise<{ user: User }> {
  return request('/api/auth/register', { method: 'POST', body: JSON.stringify(input) })
}

export function login(input: { email: string; password: string }): Promise<{ user: User }> {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify(input) })
}

export function logout(): Promise<void> {
  return request('/api/auth/logout', { method: 'POST' })
}

export function listBoards(): Promise<Page<BoardSummary>> {
  return request('/api/boards?pageSize=100')
}

export function createBoard(name: string): Promise<{ board: BoardDetail }> {
  return request('/api/boards', { method: 'POST', body: JSON.stringify({ name }) })
}

export function getBoard(boardId: string): Promise<{ board: BoardDetail }> {
  return request(`/api/boards/${boardId}`)
}

export function renameBoard(boardId: string, name: string): Promise<{ board: BoardDetail }> {
  return request(`/api/boards/${boardId}`, { method: 'PATCH', body: JSON.stringify({ name }) })
}

export function deleteBoard(boardId: string): Promise<void> {
  return request(`/api/boards/${boardId}`, { method: 'DELETE' })
}

export function inviteMember(boardId: string, email: string): Promise<{ member: Member }> {
  return request(`/api/boards/${boardId}/members`, { method: 'POST', body: JSON.stringify({ email }) })
}

export function removeMember(boardId: string, userId: string): Promise<void> {
  return request(`/api/boards/${boardId}/members/${userId}`, { method: 'DELETE' })
}

export function listTasks(boardId: string): Promise<Page<Task>> {
  return request(`/api/boards/${boardId}/tasks?pageSize=200`)
}

export interface TaskInput {
  title: string
  description: string
  status: Status
  assigneeId: string | null
  dueDate: string | null
}

export function createTask(boardId: string, input: TaskInput): Promise<{ task: Task }> {
  return request(`/api/boards/${boardId}/tasks`, { method: 'POST', body: JSON.stringify(input) })
}

export function updateTask(boardId: string, taskId: string, input: Partial<TaskInput> & { position?: number }): Promise<{ task: Task }> {
  return request(`/api/boards/${boardId}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deleteTask(boardId: string, taskId: string): Promise<void> {
  return request(`/api/boards/${boardId}/tasks/${taskId}`, { method: 'DELETE' })
}
