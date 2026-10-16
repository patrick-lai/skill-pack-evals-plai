export type Member = { id: string; email: string };
export type Status = 'todo' | 'doing' | 'done';

export type BoardSummary = {
  id: string;
  name: string;
  taskCount: number;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: Status;
  assigneeId: string | null;
  dueDate: string | null;
  position: number;
};

export type BoardDetail = {
  board: { id: string; name: string };
  tasks: Task[];
  members: Member[];
};

export type TaskInput = {
  title: string;
  description: string;
  status: Status;
  assigneeId: string | null;
  dueDate: string | null;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const UNREACHABLE = "Quay can't be reached. Check that the app is running.";

async function raw(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, UNREACHABLE);
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: { error?: unknown } | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as { error?: unknown };
    } catch {
      throw new ApiError(res.status, 'Quay sent a response that was not JSON');
    }
  }
  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Request failed';
    throw new ApiError(res.status, message);
  }
  return data as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return parse<T>(await raw(path, init));
}

export const api = {
  async me(): Promise<Member | null> {
    const res = await raw('/api/auth/me');
    if (res.status === 401) return null;
    const data = await parse<{ member: Member }>(res);
    return data.member;
  },
  async register(email: string, password: string): Promise<Member> {
    const data = await request<{ member: Member }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return data.member;
  },
  async login(email: string, password: string): Promise<Member> {
    const data = await request<{ member: Member }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return data.member;
  },
  async logout(): Promise<void> {
    await request('/api/auth/logout', { method: 'POST' });
  },
  async listBoards(): Promise<BoardSummary[]> {
    const data = await request<{ boards: BoardSummary[] }>('/api/boards');
    return data.boards;
  },
  async createBoard(name: string): Promise<BoardSummary> {
    const data = await request<{ board: BoardSummary }>('/api/boards', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return data.board;
  },
  async getBoard(id: string): Promise<BoardDetail> {
    return request<BoardDetail>(`/api/boards/${id}`);
  },
  async renameBoard(id: string, name: string): Promise<BoardSummary> {
    const data = await request<{ board: BoardSummary }>(`/api/boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    return data.board;
  },
  async deleteBoard(id: string): Promise<void> {
    await request(`/api/boards/${id}`, { method: 'DELETE' });
  },
  async createTask(boardId: string, input: TaskInput): Promise<Task> {
    const data = await request<{ task: Task }>(`/api/boards/${boardId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.task;
  },
  async updateTask(id: string, patch: Partial<TaskInput>): Promise<Task> {
    const data = await request<{ task: Task }>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return data.task;
  },
  async deleteTask(id: string): Promise<void> {
    await request(`/api/tasks/${id}`, { method: 'DELETE' });
  },
};

export function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return UNREACHABLE;
}
