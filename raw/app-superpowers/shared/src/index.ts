export type TaskStatus = 'todo' | 'doing' | 'done';

export type MemberRole = 'owner' | 'member';

export type User = {
  id: string;
  email: string;
  name: string;
};

export type BoardSummary = {
  id: string;
  name: string;
  role: MemberRole;
  taskCount: number;
  createdAt: string;
};

export type Member = {
  id: string;
  email: string;
  name: string;
  role: MemberRole;
};

export type Task = {
  id: string;
  boardId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type BoardDetail = {
  id: string;
  name: string;
  role: MemberRole;
  createdAt: string;
  members: Member[];
  tasks: Task[];
};
