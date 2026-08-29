/**
 * Idempotency utilities to support safe retries on create and state transition endpoints.
 */

export interface IdempotentOperationRecord<T> {
  key: string;
  response: T;
  createdAt: string;
}

export function validateIdempotencyKey(key?: string | null): boolean {
  if (!key) return false;
  return typeof key === "string" && key.trim().length >= 8;
}
