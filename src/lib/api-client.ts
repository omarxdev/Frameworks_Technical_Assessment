export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  status: number;
}

export class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.code = error.code;
    this.status = error.status;
    this.details = error.details;
  }
}

export const asApiRequestError = (error: unknown) =>
  error instanceof ApiRequestError ? error : null;

export const isAccessError = (error: unknown) => {
  const apiError = asApiRequestError(error);
  if (!apiError) return false;
  return (
    apiError.status === 401 ||
    apiError.status === 403 ||
    apiError.code === "UNAUTHENTICATED" ||
    apiError.code === "FORBIDDEN"
  );
};

export const errorMessageFrom = (error: unknown, fallback: string) => {
  const apiError = asApiRequestError(error);
  if (apiError) return apiError.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `key-${Date.now()}-${Math.random()}`;

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  idempotencyKey?: string;
}

export const apiFetch = async <T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { body, idempotencyKey, headers, ...rest } = options;

  const isFormData = body instanceof FormData;
  const finalHeaders = new Headers(headers);

  if (body !== undefined && !isFormData) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (idempotencyKey) {
    finalHeaders.set("Idempotency-Key", idempotencyKey);
  }

  const response = await fetch(`/api${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: "same-origin",
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiRequestError({
      code: payload?.code ?? "REQUEST_FAILED",
      message: payload?.message ?? `Request failed with status ${response.status}`,
      details: payload?.details,
      status: response.status,
    });
  }

  return payload as T;
};
