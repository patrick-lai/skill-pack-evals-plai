export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const response = await fetch(path, {
    method: init?.method ?? (init?.body === undefined ? "GET" : "POST"),
    credentials: "include",
    headers: init?.body === undefined ? undefined : { "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await response.text();
  let data: { error?: string } | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string };
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? "The request failed.");
  }
  return data as T;
}
