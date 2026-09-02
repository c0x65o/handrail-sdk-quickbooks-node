import {
  HandrailQuickBooksConfigError,
  HandrailQuickBooksError,
  type HandrailQuickBooksErrorBody
} from "./errors.js";
import type { HandrailQuickBooksAuthConfig, HandrailQuickBooksClientConfig } from "./types.js";

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const UNSAFE_DETAIL_KEY_PATTERN =
  /(?:access[_-]?token|refresh[_-]?token|api[_-]?key|authorization|client[_-]?secret|clientSecret|password|credential|raw(?:Provider)?Payload|rawPayload|rawProviderPayload|providerError|rawProviderError|QueryResponse)/i;
const UNSAFE_DETAIL_VALUE_PATTERN =
  /(?:access_token|refresh_token|client_secret|authorization:\s*bearer|bearer\s+[a-z0-9._-]+|raw provider payload|rawProviderPayload|rawPayload|QueryResponse|stored-access-token|stored-refresh-token)/i;

export interface HandrailQuickBooksRequestOptions {
  readonly body?: unknown;
  readonly headers?: HeadersInit;
  readonly idempotencyKey?: string;
  readonly method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  readonly query?: Record<string, boolean | number | string | null | undefined>;
  readonly signal?: AbortSignal;
}

export class HandrailQuickBooksHttpClient {
  private readonly config: HandrailQuickBooksClientConfig;

  constructor(config: HandrailQuickBooksClientConfig) {
    this.config = config;
  }

  async request<TResponse>(path: string, options: HandrailQuickBooksRequestOptions = {}) {
    const method = options.method ?? "GET";
    const url = this.buildUrl(path, options.query);
    const maxAttempts = this.maxAttempts(method, options.idempotencyKey);

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.fetchJson<TResponse>(url, method, options);
      } catch (error) {
        lastError = error;
        if (!this.shouldRetry(error, attempt, maxAttempts)) {
          throw error;
        }
        await delay(retryDelayMs(attempt));
      }
    }

    throw lastError;
  }

  private buildUrl(path: string, query?: HandrailQuickBooksRequestOptions["query"]) {
    const baseUrl = new URL(this.config.baseUrl);
    const normalizedBasePath = baseUrl.pathname.replace(/\/+$/, "");
    const normalizedPath = path.replace(/^\/+/, "");
    baseUrl.pathname = `${normalizedBasePath}/${normalizedPath}`;

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) {
        baseUrl.searchParams.set(key, String(value));
      }
    }

    return baseUrl;
  }

  private async fetchJson<TResponse>(
    url: URL,
    method: string,
    options: HandrailQuickBooksRequestOptions
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const abortListener = () => controller.abort();
    options.signal?.addEventListener("abort", abortListener, { once: true });

    try {
      const response = await this.fetchImpl(url, {
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        headers: this.buildHeaders(options.headers, options.idempotencyKey),
        method,
        signal: controller.signal
      });

      if (!response.ok) {
        throw await this.toServiceError(response, method, url);
      }

      if (response.status === 204) {
        return undefined as TResponse;
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      if (error instanceof HandrailQuickBooksError) {
        throw error;
      }

      const isTimeout = error instanceof DOMException && error.name === "AbortError";
      throw new HandrailQuickBooksError(
        isTimeout ? "Handrail QuickBooks request timed out." : "Handrail QuickBooks request failed.",
        {
          cause: error,
          code: isTimeout ? "REQUEST_TIMEOUT" : "REQUEST_FAILED",
          method,
          retryable: true,
          url: redactUrl(url)
        }
      );
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortListener);
    }
  }

  private async fetchImpl(url: URL, init: RequestInit) {
    const fetchImpl = this.config.fetch ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new HandrailQuickBooksConfigError("A fetch implementation is required.");
    }

    return fetchImpl(url, init);
  }

  private buildHeaders(headers?: HeadersInit, idempotencyKey?: string) {
    const requestHeaders = new Headers(headers);
    requestHeaders.set("accept", "application/json");
    requestHeaders.set("content-type", "application/json");

    const auth = this.resolveAuth();
    if (auth) {
      if (auth.scheme === "api-key") {
        requestHeaders.set(auth.headerName ?? "x-api-key", auth.token);
      } else {
        requestHeaders.set(auth.headerName ?? "authorization", `Bearer ${auth.token}`);
      }
    }

    if (this.config.tenantId) {
      requestHeaders.set("x-handrail-tenant-id", this.config.tenantId);
    }

    if (idempotencyKey) {
      requestHeaders.set("idempotency-key", idempotencyKey);
    }

    return requestHeaders;
  }

  private resolveAuth(): HandrailQuickBooksAuthConfig | undefined {
    if (this.config.auth) {
      return this.config.auth;
    }

    if (!this.config.apiKey) {
      return undefined;
    }

    return {
      scheme: "bearer",
      token: this.config.apiKey
    };
  }

  private async toServiceError(response: Response, method: string, url: URL) {
    const body = await readErrorBody(response);
    const requestId = body?.requestId ?? response.headers.get("x-request-id") ?? undefined;
    const code = body?.code ?? body?.error ?? `HTTP_${response.status}`;

    const serviceMessage = body?.message ?? body?.error;
    const message = serviceMessage && !UNSAFE_DETAIL_VALUE_PATTERN.test(serviceMessage)
      ? serviceMessage
      : `Handrail QuickBooks request failed with status ${response.status}.`;

    return new HandrailQuickBooksError(
      message,
      {
        code,
        details: sanitizeErrorDetails(body?.details),
        method,
        requestId,
        retryable: RETRYABLE_STATUS_CODES.has(response.status),
        status: response.status,
        url: redactUrl(url)
      }
    );
  }

  private maxAttempts(method: string, idempotencyKey?: string) {
    const canRetry = IDEMPOTENT_METHODS.has(method) || Boolean(idempotencyKey);
    return canRetry ? Math.max(1, this.config.retries + 1) : 1;
  }

  private shouldRetry(error: unknown, attempt: number, maxAttempts: number) {
    return (
      attempt < maxAttempts &&
      error instanceof HandrailQuickBooksError &&
      error.retryable
    );
  }
}

async function readErrorBody(response: Response): Promise<HandrailQuickBooksErrorBody | undefined> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }

  try {
    const body = (await response.json()) as HandrailQuickBooksErrorBody;
    return body;
  } catch {
    return undefined;
  }
}

function retryDelayMs(attempt: number) {
  return Math.min(100 * 2 ** (attempt - 1), 1_000);
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sanitizeErrorDetails(details: unknown): unknown {
  if (details === undefined || details === null) {
    return undefined;
  }

  if (typeof details === "string") {
    return UNSAFE_DETAIL_VALUE_PATTERN.test(details) ? "[redacted]" : details;
  }

  if (typeof details === "number" || typeof details === "boolean") {
    return details;
  }

  if (Array.isArray(details)) {
    const sanitized = details
      .map((item) => sanitizeErrorDetails(item))
      .filter((item) => item !== undefined);
    return sanitized.length > 0 ? sanitized : undefined;
  }

  if (typeof details === "object") {
    const sanitized = Object.fromEntries(
      Object.entries(details as Record<string, unknown>)
        .filter(([key]) => !UNSAFE_DETAIL_KEY_PATTERN.test(key))
        .map(([key, value]) => [key, sanitizeErrorDetails(value)])
        .filter(([, value]) => value !== undefined)
    );
    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  return undefined;
}

function redactUrl(url: URL) {
  const redacted = new URL(url);
  for (const key of Array.from(redacted.searchParams.keys())) {
    if (UNSAFE_DETAIL_KEY_PATTERN.test(key)) {
      redacted.searchParams.set(key, "[redacted]");
    }
  }
  return redacted.toString();
}
