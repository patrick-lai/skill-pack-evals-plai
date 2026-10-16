export type Status = 'todo' | 'doing' | 'done';

export type User = {
  id: string;
  name: string;
  email: string;
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: User;
};

export type Member = User & {
  role: 'owner' | 'member';
};

export type Task = {
  id: string;
  boardId: string;
  title: string;
  description: string;
  status: Status;
  assigneeId: string | null;
  assignee: User | null;
  dueDate: string | null;
  position: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BoardSummary = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  role: 'owner' | 'member';
  createdAt: string;
  updatedAt: string;
  counts: Record<Status, number>;
  members: Member[];
};

export type BoardDetail = BoardSummary & {
  tasks: Task[];
};
