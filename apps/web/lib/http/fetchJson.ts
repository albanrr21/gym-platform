type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessageFromBody(body: unknown): string | null {
  if (!isRecord(body)) return null;

  const error = body.error;
  if (typeof error === "string" && error.trim()) return error;

  const message = body.message;
  if (typeof message === "string" && message.trim()) return message;

  return null;
}

export class FetchJsonError extends Error {
  status: number;
  body: unknown;

  constructor({
    status,
    message,
    body,
  }: {
    status: number;
    message: string;
    body: unknown;
  }) {
    super(message);
    this.name = "FetchJsonError";
    this.status = status;
    this.body = body;
  }
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  let body: unknown = null;
  try {
    body = isJson ? await res.json() : await res.text();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const messageFromBody = getErrorMessageFromBody(body);
    const message =
      messageFromBody ??
      res.statusText ??
      `Request failed with status ${res.status}`;
    throw new FetchJsonError({ status: res.status, message, body });
  }

  return body as T;
}
