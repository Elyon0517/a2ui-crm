import {
  CATALOG_ID,
  messageSchema,
  type Component,
  type Message,
} from "./protocol";
export type Surface = {
  id: string;
  components: Record<string, Component>;
  data: unknown;
  sendDataModel: boolean;
};
export type Snapshot = Readonly<Record<string, Surface>>;
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
export function parts(path: string): string[] {
  if (path === "/" || path === "") return [];
  if (!path.startsWith("/") || /~(?![01])/u.test(path))
    throw new Error("Invalid JSON pointer");
  const keys = path
    .slice(1)
    .split("/")
    .map((x) => x.replace(/~1/g, "/").replace(/~0/g, "~"));
  if (keys.some((x) => forbidden.has(x)) || keys.length > 32)
    throw new Error("Unsafe JSON pointer");
  return keys;
}
export function read(data: unknown, path: string): unknown {
  return parts(path).reduce<unknown>(
    (v, k) =>
      v && typeof v === "object" && Object.prototype.hasOwnProperty.call(v, k)
        ? (v as Record<string, unknown>)[k]
        : undefined,
    data,
  );
}
export function write(
  data: unknown,
  path: string,
  value: unknown,
  remove = false,
): unknown {
  const keys = parts(path);
  if (!keys.length) return remove ? {} : structuredClone(value);
  const root = structuredClone(data ?? {}) as Record<string, unknown>;
  if (!root || typeof root !== "object")
    throw new Error("Cannot traverse scalar model");
  let current: Record<string, unknown> = root;
  for (const k of keys.slice(0, -1)) {
    if (!Object.prototype.hasOwnProperty.call(current, k)) current[k] = {};
    const next = current[k];
    if (!next || typeof next !== "object")
      throw new Error("Cannot traverse scalar");
    current = next as Record<string, unknown>;
  }
  const key = keys[keys.length - 1];
  if (
    Array.isArray(current) &&
    (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) > current.length)
  )
    throw new Error("Invalid array index");
  if (remove) {
    if (Array.isArray(current)) current.splice(Number(key), 1);
    else delete current[key];
  } else current[key] = value;
  return root;
}
function freeze(value: unknown): void {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const v of Object.values(value)) freeze(v);
  }
}
function safe(value: unknown, depth = 0): void {
  if (depth > 40) throw new Error("Payload nesting limit");
  if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      if (forbidden.has(k)) throw new Error("Unsafe object key");
      safe(v, depth + 1);
    }
}
export class A2UIStore {
  private state: Snapshot = Object.freeze({});
  private listeners = new Set<() => void>();
  constructor(
    private limits = { surfaces: 16, components: 500, messageBytes: 256_000 },
  ) {}
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () => this.state;
  private commit(next: Record<string, Surface>) {
    freeze(next);
    this.state = next;
    for (const fn of this.listeners) fn();
  }
  clear() {
    this.commit({});
  }
  apply(raw: unknown): Message {
    if (
      new TextEncoder().encode(JSON.stringify(raw)).length >
      this.limits.messageBytes
    )
      throw new Error("Message size limit");
    safe(raw);
    const msg = messageSchema.parse(raw);
    const next = { ...this.state };
    if ("createSurface" in msg) {
      const m = msg.createSurface;
      if (next[m.surfaceId]) throw new Error("Surface already exists");
      if (Object.keys(next).length >= this.limits.surfaces)
        throw new Error("Surface limit");
      next[m.surfaceId] = {
        id: m.surfaceId,
        components: {},
        data: {},
        sendDataModel: m.sendDataModel ?? false,
      };
    } else {
      const m =
        "updateComponents" in msg
          ? msg.updateComponents
          : "updateDataModel" in msg
            ? msg.updateDataModel
            : msg.deleteSurface;
      const old = next[m.surfaceId];
      if (!old) throw new Error("Unknown surface");
      if ("deleteSurface" in msg) delete next[m.surfaceId];
      else if ("updateComponents" in msg) {
        const components = { ...old.components };
        const ids = new Set<string>();
        for (const c of msg.updateComponents.components) {
          if (ids.has(c.id)) throw new Error("Duplicate component ID");
          ids.add(c.id);
          components[c.id] = c;
        }
        if (Object.keys(components).length > this.limits.components)
          throw new Error("Component limit");
        next[m.surfaceId] = { ...old, components };
      } else if ("updateDataModel" in msg) {
        const u = msg.updateDataModel;
        next[m.surfaceId] = {
          ...old,
          data: write(
            old.data,
            u.path ?? "/",
            u.value,
            !Object.prototype.hasOwnProperty.call(u, "value"),
          ),
        };
      }
    }
    this.commit(next);
    return msg;
  }
  setValue(surfaceId: string, path: string, value: unknown) {
    safe(value);
    const old = this.state[surfaceId];
    if (!old) throw new Error("Unknown surface");
    this.commit({
      ...this.state,
      [surfaceId]: { ...old, data: write(old.data, path, value) },
    });
  }
  capabilities() {
    return { a2uiClientCapabilities: { supportedCatalogIds: [CATALOG_ID] } };
  }
}
