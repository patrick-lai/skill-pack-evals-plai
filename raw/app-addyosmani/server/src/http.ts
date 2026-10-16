import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express'
import type { ZodType, output as ZodOutput } from 'zod'
import { log } from './log.ts'

export class HttpError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function parseBody<T extends ZodType>(schema: T, body: unknown): ZodOutput<T> {
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Some fields are invalid.', result.error.flatten())
  }
  return result.data as ZodOutput<T>
}

export function wrap(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

export function sendError(res: Response, error: unknown): void {
  if (error instanceof HttpError) {
    const body: { code: string; message: string; details?: unknown } = {
      code: error.code,
      message: error.message,
    }
    if (error.details !== undefined) body.details = error.details
    res.status(error.status).json({ error: body })
    return
  }

  if (error instanceof SyntaxError) {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be JSON.' } })
    return
  }

  log('error', 'http.unhandled', { message: error instanceof Error ? error.message : 'unknown' })
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong.' } })
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }
  sendError(res, error)
}

export function pageResult<T>(data: T[], totalItems: number, page: number, pageSize: number) {
  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize),
    },
  }
}
