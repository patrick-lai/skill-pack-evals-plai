export const STATUSES = ['todo', 'doing', 'done'] as const

export type Status = (typeof STATUSES)[number]

export interface User {
  id: string
  email: string
  name: string
}

export interface Member extends User {
  role: 'owner' | 'member'
}

export interface BoardSummary {
  id: string
  name: string
  ownerId: string
  role: 'owner' | 'member'
  memberCount: number
  createdAt: string
}

export interface BoardDetail extends BoardSummary {
  members: Member[]
}

export interface Task {
  id: string
  boardId: string
  title: string
  description: string
  status: Status
  assigneeId: string | null
  dueDate: string | null
  position: number
  createdAt: string
  updatedAt: string
}

export interface Page<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export interface Movable {
  id: string
  status: Status
  position: number
}
