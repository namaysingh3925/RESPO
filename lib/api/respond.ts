/**
 * Shared plumbing for the REST Route Handlers in app/api/**:
 * JSON responses, request validation with the shared Zod schemas, and one error mapper that turns
 * every failure into the standard `ApiErrorBody` (docs/ARCHITECTURE.md §3).
 */
import "server-only";

import { z } from "zod";
import { ServiceError, type ServiceErrorCode } from "@/lib/services/errors";
import type { ApiErrorBody } from "@/lib/types";
import { toFieldErrors } from "@/lib/validation";

/** Personal or fast-changing data (tracking, admin, availability, writes): never stored by browsers or CDNs. */
export const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Public, rarely-changing data (the menu): a CDN may serve it for a minute, then revalidate in the background. */
export const PUBLIC_SHORT_CACHE = { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } as const;

/** Upper bound for request bodies; the largest valid order is a few kilobytes. */
const MAX_BODY_BYTES = 64 * 1024;

const INTERNAL_ERROR_MESSAGE = "Something went wrong on our side. Please try again in a moment.";

/** JSON response. Pass a number for the status, or a full ResponseInit (e.g. extra headers). */
export function json<T>(data: T, init: number | ResponseInit = 200): Response {
  const options = typeof init === "number" ? { status: init } : init;
  return Response.json(data, options);
}

/** Standard error response. Error bodies are never cached. */
export function errorResponse(
  code: ServiceErrorCode,
  message: string,
  options: { status?: number; fieldErrors?: Record<string, string[]>; headers?: HeadersInit } = {},
): Response {
  const status = options.status ?? new ServiceError(code, message).status; // default status for the code
  const body: ApiErrorBody = {
    error: { code, message, ...(options.fieldErrors ? { fieldErrors: options.fieldErrors } : {}) },
  };
  const headers = new Headers(options.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { status, headers });
}

/** A VALIDATION_ERROR built from a single message, reported through the same field-error shape as schema failures. */
function validationError(message: string, path: PropertyKey[] = []): ServiceError {
  const issue = new z.ZodError([{ code: "custom", path, message, input: undefined }]);
  return new ServiceError("VALIDATION_ERROR", message, toFieldErrors(issue));
}

function schemaError(error: z.ZodError): ServiceError {
  return new ServiceError("VALIDATION_ERROR", "Please check the highlighted fields and try again.", toFieldErrors(error));
}

/**
 * Reads the request body as JSON and validates it with `schema`.
 * Throws ServiceError VALIDATION_ERROR (422) for an empty, oversized or malformed body, or a schema failure.
 * Unknown keys are stripped by the schema, so clients can never smuggle in prices or statuses.
 */
export async function parseJsonBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    throw validationError("The request body is too large.");
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    throw validationError("The request body couldn't be read.");
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw validationError("The request body is too large.");
  }
  if (!text.trim()) {
    throw validationError("Send the request details as a JSON body.");
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw validationError("The request body isn't valid JSON.");
  }

  return validate(schema, data);
}

/**
 * Validates URL query parameters with `schema`. Empty values (`?status=`) count as absent and, for repeated
 * keys, the first value wins. Throws ServiceError VALIDATION_ERROR (422) on failure.
 */
export function parseQuery<S extends z.ZodType>(searchParams: URLSearchParams, schema: S): z.output<S> {
  const query: Record<string, string> = {};
  for (const [key, value] of searchParams) {
    if (value.trim() !== "" && !(key in query)) query[key] = value.trim();
  }
  return validate(schema, query);
}

/** Validates already-collected input with `schema`. Throws ServiceError VALIDATION_ERROR (422) on failure. */
export function validate<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw schemaError(result.error);
  return result.data;
}

/** Cheap shape check for database ids (cuid) in route params, so junk never reaches a query. */
export function isPlausibleId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

/** A VALIDATION_ERROR for one field, e.g. `invalidField("date", "Use a real calendar date")`. */
export function invalidField(field: string, message: string): ServiceError {
  return validationError(message, field.split("."));
}

/**
 * Maps anything thrown inside a handler to an error response:
 * ServiceError → its code/status/fieldErrors · ZodError → 422 VALIDATION_ERROR · anything else → 500 INTERNAL_ERROR
 * with a generic message (details are logged server-side only, never sent to the client).
 */
export function handleRouteError(error: unknown, context: string): Response {
  if (error instanceof ServiceError) {
    return errorResponse(error.code, error.message, { status: error.status, fieldErrors: error.fieldErrors });
  }
  if (error instanceof z.ZodError) {
    const mapped = schemaError(error);
    return errorResponse(mapped.code, mapped.message, { fieldErrors: mapped.fieldErrors });
  }
  console.error(`[api] ${context} failed:`, error);
  return errorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE);
}
