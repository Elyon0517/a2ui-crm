import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type ComponentType,
} from "react";
import { A2UIStore, read, type Surface } from "./runtime";
import type { Action, Component } from "./protocol";
export type RenderContext = {
  surface: Surface;
  component: Component;
  scope: string;
  resolve: (value: unknown) => unknown;
  render: (id: string) => ReactNode;
  setValue: (path: string, value: unknown) => void;
  dispatch: () => void;
  pending: boolean;
};
export type Registry = Partial<
  Record<Component["component"], ComponentType<RenderContext>>
>;
export function scopedPath(path: string, scope: string) {
  return path.startsWith("/") ? path : `${scope}/${path}`;
}
const display = (v: unknown) =>
  v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
export function A2UISurface({
  store,
  surfaceId,
  onAction,
  registry = {},
  allowedActions = [],
  onError,
}: {
  store: A2UIStore;
  surfaceId: string;
  onAction: (
    event: Action,
    metadata: Record<string, unknown>,
  ) => void | Promise<void>;
  registry?: Registry;
  allowedActions?: readonly string[];
  onError?: (error: Error) => void;
}) {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const surface = state[surfaceId];
  const prefix = useId();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (!surface) return null;
  const fail = (err: unknown) => {
    const e = err instanceof Error ? err : new Error(String(err));
    setError(e.message);
    onError?.(e);
  };
  const render = (
    id: string,
    scope = "",
    ancestors: string[] = [],
    budget = { count: 0 },
  ): ReactNode => {
    if (
      ancestors.includes(id) ||
      ancestors.length > 32 ||
      ++budget.count > 1000
    )
      return <span role="alert">Invalid component graph</span>;
    const c = surface.components[id];
    if (!c)
      return (
        <span aria-busy="true" className="a2ui-placeholder">
          Loading component…
        </span>
      );
    const resolve = (v: unknown): unknown =>
      v && typeof v === "object" && "path" in v
        ? read(surface.data, scopedPath(String(v.path), scope))
        : v;
    const child = (ref: string) =>
      render(ref, scope, [...ancestors, id], budget);
    const setValue = (path: string, value: unknown) => {
      try {
        store.setValue(surfaceId, scopedPath(path, scope), value);
      } catch (e) {
        fail(e);
      }
    };
    const dispatch = async () => {
      if (!("action" in c) || !c.action || busy.current) return;
      const event = c.action.event;
      if (!allowedActions.includes(event.name)) {
        fail(new Error("Action is not allowed"));
        return;
      }
      const invalid = Object.values(surface.components).find(
        (x) =>
          x.component === "TextField" &&
          x.required &&
          !display(resolve(x.value)).trim(),
      );
      if (invalid) {
        fail(new Error("Please complete required fields"));
        return;
      }
      busy.current = true;
      setPending(true);
      setError("");
      try {
        const context = Object.fromEntries(
          Object.entries(event.context).map(([k, v]) => [k, resolve(v)]),
        );
        await onAction(
          {
            action: {
              name: event.name,
              surfaceId,
              sourceComponentId: id,
              timestamp: new Date().toISOString(),
              context,
            },
          },
          surface.sendDataModel
            ? {
                a2uiClientDataModel: {
                  surfaces: { [surfaceId]: structuredClone(surface.data) },
                },
              }
            : {},
        );
      } catch (e) {
        fail(e);
      } finally {
        busy.current = false;
        setPending(false);
      }
    };
    const ctx: RenderContext = {
      surface,
      pending,
      component: c,
      scope,
      resolve,
      render: child,
      setValue,
      dispatch: () => {
        void dispatch();
      },
    };
    const Custom = registry[c.component];
    if (Custom) return <Custom {...ctx} />;
    switch (c.component) {
      case "Text":
        return c.variant === "h2" ? (
          <h2>{display(resolve(c.text))}</h2>
        ) : (
          <p className={c.variant === "caption" ? "a2ui-caption" : undefined}>
            {display(resolve(c.text))}
          </p>
        );
      case "Row":
      case "Column":
      case "List": {
        const children = c.children;
        return (
          <div className={`a2ui-${c.component.toLowerCase()}`}>
            {Array.isArray(children)
              ? children.map((ref) => <div key={ref}>{child(ref)}</div>)
              : (() => {
                  const path = scopedPath(children.path, scope),
                    values = read(surface.data, path);
                  return values && typeof values === "object"
                    ? Object.keys(values)
                        .slice(0, 500)
                        .map((k) => (
                          <div key={k}>
                            {render(
                              children.componentId,
                              `${path}/${k.replace(/~/g, "~0").replace(/\//g, "~1")}`,
                              [...ancestors, id],
                              budget,
                            )}
                          </div>
                        ))
                    : null;
                })()}
          </div>
        );
      }
      case "Card":
        return <section className="a2ui-card">{child(c.child)}</section>;
      case "Divider":
        return <hr />;
      case "Button":
        return (
          <button
            type="button"
            disabled={pending || Boolean(resolve(c.disabled))}
            onClick={() => void dispatch()}
          >
            {child(c.child)}
          </button>
        );
      case "TextField": {
        const props = {
          id: `${prefix}-${id}-${scope}`,
          value: display(resolve(c.value)),
          required: c.required,
          onChange: (
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) => setValue(c.value.path, e.target.value),
        };
        return (
          <label htmlFor={props.id}>
            {display(resolve(c.label))}
            {c.variant === "longText" ? (
              <textarea {...props} />
            ) : (
              <input {...props} />
            )}
          </label>
        );
      }
      case "CheckBox":
        return (
          <label>
            <input
              type="checkbox"
              checked={Boolean(resolve(c.value))}
              onChange={(e) => setValue(c.value.path, e.target.checked)}
            />
            {display(resolve(c.label))}
          </label>
        );
      case "ChoicePicker":
        return (
          <label>
            {display(resolve(c.label))}
            <select
              value={display(resolve(c.value))}
              onChange={(e) => setValue(c.value.path, e.target.value)}
            >
              <option value="">Select…</option>
              {c.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        );
      case "Metric":
        return (
          <div className="a2ui-metric">
            <span>{display(resolve(c.label))}</span>
            <strong>{display(resolve(c.value))}</strong>
          </div>
        );
      case "EvidenceCard":
        return (
          <section className="a2ui-evidence">
            <small>{display(resolve(c.label))}</small>
            <blockquote>{display(resolve(c.excerpt))}</blockquote>
            {c.action && (
              <button disabled={pending} onClick={() => void dispatch()}>
                View evidence
              </button>
            )}
          </section>
        );
      case "Notice":
        return (
          <aside className={`a2ui-notice ${c.tone ?? "info"}`} role="status">
            {display(resolve(c.text))}
          </aside>
        );
    }
  };
  return (
    <div className="a2ui-surface" aria-busy={pending}>
      {render("root")}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
