export class ServiceError {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly details?: unknown
  ) {}
}

export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError };

export function ok<T = void>(data?: T): Result<T> {
  return { ok: true, data: data as T };
}

export function failure(code: string, message: string, details?: unknown): Result<never> {
  return { ok: false, error: new ServiceError(code, message, details) };
}
