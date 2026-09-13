import type { ApiErrorBody } from "@/lib/types";

export type ServiceErrorCode = ApiErrorBody["error"]["code"];

const STATUS_BY_CODE: Record<ServiceErrorCode, number> = {
  VALIDATION_ERROR: 422,
  NOT_FOUND: 404,
  SLOT_UNAVAILABLE: 409,
  ITEM_UNAVAILABLE: 409,
  INVALID_TRANSITION: 409,
  MINIMUM_NOT_MET: 422,
  RESTAURANT_CLOSED: 409,
  UNAUTHORIZED: 401,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/** Thrown by services for expected business-rule failures; route handlers map it to ApiErrorBody. */
export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(code: ServiceErrorCode, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fieldErrors = fieldErrors;
  }
}
