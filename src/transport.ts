/** Incremental JSONL / SSE framing. SSE payloads may also carry legacy chat events. */
export class StreamDecoder {
  private buffer = "";
  private data: string[] = [];
  private event = "message";
  constructor(
    private mode: "sse" | "jsonl",
    private onValue: (value: unknown, event: string) => void,
    private maxChars = 256_000,
  ) {}
  push(chunk: string) {
    this.buffer += chunk;
    let i: number;
    while ((i = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, i).replace(/\r$/, "");
      this.buffer = this.buffer.slice(i + 1);
      this.line(line);
    }
    if (this.buffer.length > this.maxChars) throw new Error("Frame size limit");
  }
  private emit(raw: string, event: string) {
    if (raw.length > this.maxChars) throw new Error("Frame size limit");
    if (raw.trim() && raw.trim() !== "[DONE]")
      this.onValue(JSON.parse(raw), event);
  }
  private line(line: string) {
    if (this.mode === "jsonl") {
      this.emit(line, "message");
      return;
    }
    if (!line) {
      if (this.data.length) this.emit(this.data.join("\n"), this.event);
      this.data = [];
      this.event = "message";
      return;
    }
    if (line.startsWith(":")) return;
    const i = line.indexOf(":");
    const field = i < 0 ? line : line.slice(0, i);
    let value = i < 0 ? "" : line.slice(i + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") {
      this.data.push(value);
      if (this.data.reduce((n, s) => n + s.length, 0) > this.maxChars)
        throw new Error("Frame size limit");
    }
    if (field === "event") this.event = value;
  }
  finish() {
    if (this.buffer) this.line(this.buffer.replace(/\r$/, ""));
    this.buffer = "";
    if (this.mode === "sse") this.line("");
  }
}
export async function consumeResponse(
  response: Response,
  onValue: (value: unknown, event: string) => void,
  options: { mode?: "sse" | "jsonl"; signal?: AbortSignal } = {},
) {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.body) throw new Error("Missing stream body");
  const reader = response.body.getReader(),
    decoder = new TextDecoder("utf-8", { fatal: true }),
    frames = new StreamDecoder(options.mode ?? "sse", onValue);
  const abort = () => {
    void reader.cancel();
  };
  options.signal?.addEventListener("abort", abort, { once: true });
  try {
    while (true) {
      options.signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      frames.push(decoder.decode(value, { stream: true }));
    }
    options.signal?.throwIfAborted();
    frames.push(decoder.decode());
    frames.finish();
  } finally {
    options.signal?.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
