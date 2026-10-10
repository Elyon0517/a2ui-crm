import { describe, it, expect } from "vitest";
import {
  A2UIStore,
  CATALOG_ID,
  StreamDecoder,
  read,
  write,
  coachToMessages,
  safeCRMPath,
  consumeResponse,
} from "../src";
const create = {
  version: "v0.9",
  createSurface: { surfaceId: "s", catalogId: CATALOG_ID },
};
describe("runtime", () => {
  it("creates, updates, replaces and deletes independent surfaces", () => {
    const s = new A2UIStore();
    s.apply(create);
    s.apply({
      ...create,
      createSurface: { ...create.createSurface, surfaceId: "other" },
    });
    s.apply({
      version: "v0.9",
      updateDataModel: { surfaceId: "s", path: "/a/b", value: 3 },
    });
    expect(read(s.getSnapshot().s.data, "/a/b")).toBe(3);
    s.apply({
      version: "v0.9",
      updateDataModel: { surfaceId: "s", path: "/a/b" },
    });
    expect(read(s.getSnapshot().s.data, "/a/b")).toBeUndefined();
    s.apply({ version: "v0.9", deleteSurface: { surfaceId: "s" } });
    expect(Object.keys(s.getSnapshot())).toEqual(["other"]);
  });
  it("rejects bad versions, catalogs, lifecycle and components atomically", () => {
    const s = new A2UIStore();
    expect(() => s.apply({ ...create, version: "v0.8" })).toThrow();
    s.apply(create);
    expect(() => s.apply(create)).toThrow();
    const before = s.getSnapshot();
    expect(() =>
      s.apply({
        version: "v0.9",
        updateComponents: {
          surfaceId: "s",
          components: [{ id: "root", component: "Script", code: "alert(1)" }],
        },
      }),
    ).toThrow();
    expect(s.getSnapshot()).toBe(before);
  });
  it("blocks prototype pollution and freezes snapshots", () => {
    const s = new A2UIStore();
    s.apply(create);
    expect(() => s.setValue("s", "/__proto__/polluted", true)).toThrow();
    expect(() =>
      s.apply(
        JSON.parse(
          '{"version":"v0.9","updateDataModel":{"surfaceId":"s","value":{"constructor":{}}}}',
        ),
      ),
    ).toThrow();
    expect(() => {
      (s.getSnapshot().s as { id: string }).id = "changed";
    }).toThrow();
    expect(() =>
      s.apply({
        ...create,
        createSurface: { ...create.createSurface, surfaceId: "__proto__" },
      }),
    ).toThrow();
  });
  it("escapes pointers and handles array removal", () => {
    expect(read(write({}, "/a~1b/~0key", 4), "/a~1b/~0key")).toBe(4);
    expect(write([1, 2, 3], "/1", undefined, true)).toEqual([1, 3]);
    expect(() => write([], "/999999", 1)).toThrow();
  });
  it("enforces limits", () => {
    const s = new A2UIStore({ surfaces: 1, components: 1, messageBytes: 1000 });
    s.apply(create);
    expect(() =>
      s.apply({
        ...create,
        createSurface: { ...create.createSurface, surfaceId: "b" },
      }),
    ).toThrow();
  });
});
describe("framing", () => {
  it("accepts arbitrary CRLF splits, comments, multiline SSE, EOF and DONE", () => {
    const got: unknown[] = [];
    const d = new StreamDecoder("sse", (v) => got.push(v));
    const input =
      ': heartbeat\r\nevent: a2ui\r\ndata: {"x":\r\ndata: 1}\r\n\r\ndata: [DONE]\n\ndata: {"x":2}';
    for (const c of input) d.push(c);
    d.finish();
    expect(got).toEqual([{ x: 1 }, { x: 2 }]);
  });
  it("flushes JSONL EOF and fails malformed/oversized payloads", () => {
    const got: unknown[] = [];
    const d = new StreamDecoder("jsonl", (v) => got.push(v));
    d.push('{"a":1}\n{"b":2}');
    d.finish();
    expect(got).toHaveLength(2);
    expect(() =>
      new StreamDecoder("sse", () => {}, 1).push("data: {}\n"),
    ).toThrow();
  });
  it("decodes split UTF8 bytes", async () => {
    const bytes = new TextEncoder().encode('data: {"text":"你好"}\n\n');
    const response = new Response(
      new ReadableStream({
        start(c) {
          for (const b of bytes) c.enqueue(new Uint8Array([b]));
          c.close();
        },
      }),
    );
    const got: unknown[] = [];
    await consumeResponse(response, (v) => got.push(v));
    expect(got).toEqual([{ text: "你好" }]);
  });
  it("propagates HTTP and abort errors", async () => {
    await expect(
      consumeResponse(new Response("", { status: 401 }), () => {}),
    ).rejects.toThrow("401");
    const a = new AbortController();
    a.abort();
    await expect(
      consumeResponse(new Response(""), () => {}, { signal: a.signal }),
    ).rejects.toThrow();
  });
});
it("adapts snapshot without private API dependencies", () => {
  const s = new A2UIStore();
  coachToMessages({
    mode: "task",
    evidence_cards: [],
    pattern_cards: [],
    action_cards: [],
  }).forEach((m) => s.apply(m));
  expect(s.getSnapshot().coach.components.root).toBeDefined();
});
it("allows only host-selected internal routes", () => {
  expect(safeCRMPath("/student/writing/a?x=1", ["/student/writing"])).toBe(
    "/student/writing/a?x=1",
  );
  for (const p of [
    "//evil.test",
    "javascript:alert(1)",
    "/admin",
    "/student/writing/../../admin",
    "/student\\evil",
  ])
    expect(() => safeCRMPath(p, ["/student/writing"])).toThrow();
});
