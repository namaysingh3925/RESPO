import type { ApiErrorBody } from "@/lib/types";

/** Error thrown by apiFetch for non-2xx responses, carrying the API's error code and field errors. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorBody["error"]["code"];
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, body: ApiErrorBody["error"]) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.fieldErrors = body.fieldErrors ?? {};
  }
}

/** Typed JSON fetch for client components. Pass `json` to send a JSON body. */
export async function apiFetch<T>(
  url: string,
  { json, headers, ...init }: RequestInit & { json?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : init.body,
    });
  } catch {
    throw new ApiError(0, { code: "INTERNAL_ERROR", message: "Network error — check your connection and try again." });
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const body = (data as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, body ?? { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." });
  }
  return data as T;
}
