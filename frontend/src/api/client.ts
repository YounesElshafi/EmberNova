export async function api<T = any>(
  path: string,
  body?: unknown,
  method: "POST" | "PATCH" = "POST",
): Promise<T> {
  const response = await fetch(
    `/api${path}`,
    body === undefined
      ? undefined
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: { message: `Request failed (${response.status})` },
    }));
    throw new Error(
      error.error?.message || "The research service is unavailable.",
    );
  }
  return response.json();
}

export type StreamEvent =
  import("./generated/Events").SSEEventDataPayloadsEventNameInTheSSEEventFieldMustEqualEventBelow &
    Record<string, any>;

export class SSEParser {
  private pending = "";
  push(chunk: string): StreamEvent[] {
    this.pending += chunk.replace(/\r\n/g, "\n");
    const events: StreamEvent[] = [];
    let index: number;
    while ((index = this.pending.indexOf("\n\n")) >= 0) {
      const block = this.pending.slice(0, index);
      this.pending = this.pending.slice(index + 2);
      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data) {
        const event = JSON.parse(data) as StreamEvent;
        events.push(event);
      }
    }
    return events;
  }
}

export async function stream(
  path: string,
  body: unknown | undefined,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
) {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error?.message || "Research request failed.");
  }
  if (!response.body)
    throw new Error("Streaming is unavailable in this browser.");
  const reader = response.body.getReader(),
    decoder = new TextDecoder(),
    parser = new SSEParser();
  let terminal = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const event of parser.push(
        decoder.decode(value, { stream: true }),
      )) {
        onEvent(event);
        if (["turn.completed", "error"].includes(event.event)) terminal = true;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  if (!terminal)
    throw new Error(
      "The stream disconnected before completion. Reopen this thread to inspect saved evidence.",
    );
}
