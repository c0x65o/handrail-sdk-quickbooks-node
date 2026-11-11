export interface HandrailQuickBooksErrorBody {
  readonly code?: string;
  readonly details?: unknown;
  readonly error?: string;
  readonly message?: string;
  readonly requestId?: string;
}

export interface HandrailQuickBooksErrorOptions {
  readonly cause?: unknown;
  readonly code?: string;
  readonly details?: unknown;
  readonly method?: string;
  readonly requestId?: string;
  readonly retryable?: boolean;
  readonly status?: number;
  readonly url?: string;
}

export class HandrailQuickBooksError extends Error {
  /** Stable sync intent key for syncJobs.recoverStart after an ambiguous failure. */
  syncIdempotencyKey?: string;
  readonly code?: string;
  readonly details?: unknown;
  readonly method?: string;
  readonly requestId?: string;
  readonly retryable: boolean;
  readonly status?: number;
  readonly url?: string;

  constructor(message: string, options: HandrailQuickBooksErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "HandrailQuickBooksError";
    this.code = options.code;
    this.details = options.details;
    this.method = options.method;
    this.requestId = options.requestId;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
    this.url = options.url;
  }
}

export class HandrailQuickBooksConfigError extends HandrailQuickBooksError {
  constructor(message: string) {
    super(message, {
      code: "CONFIGURATION_ERROR",
      retryable: false
    });
    this.name = "HandrailQuickBooksConfigError";
  }
}
