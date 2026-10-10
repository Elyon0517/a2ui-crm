// @vitest-environment happy-dom
import { it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { A2UISurface, A2UIStore, CATALOG_ID } from "../src";
afterEach(cleanup);
function setup(action = "save") {
  const store = new A2UIStore();
  store.apply({
    version: "v0.9",
    createSurface: {
      surfaceId: "s",
      catalogId: CATALOG_ID,
      sendDataModel: true,
    },
  });
  store.apply({
    version: "v0.9",
    updateComponents: {
      surfaceId: "s",
      components: [
        { id: "root", component: "Column", children: ["field", "button"] },
        {
          id: "field",
          component: "TextField",
          label: "Goal",
          value: { path: "/goal" },
          required: true,
        },
        { id: "label", component: "Text", text: "Save" },
        {
          id: "button",
          component: "Button",
          child: "label",
          action: {
            event: { name: action, context: { goal: { path: "/goal" } } },
          },
        },
      ],
    },
  });
  return store;
}
it("binds input, validates required field and emits resolved action metadata", async () => {
  const store = setup(),
    onAction = vi.fn();
  render(
    <A2UISurface
      store={store}
      surfaceId="s"
      allowedActions={["save"]}
      onAction={onAction}
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  expect(onAction).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Goal"), {
    target: { value: "Speaking" },
  });
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(onAction).toHaveBeenCalledOnce());
  expect(onAction.mock.calls[0][0].action.context).toEqual({
    goal: "Speaking",
  });
  expect(onAction.mock.calls[0][1].a2uiClientDataModel.surfaces.s.goal).toBe(
    "Speaking",
  );
});
it("blocks unregistered actions", () => {
  const onAction = vi.fn();
  render(
    <A2UISurface
      store={setup("deleteEverything")}
      surfaceId="s"
      onAction={onAction}
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  expect(onAction).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toContain("not allowed");
});
it("renders cyclic graph safely and escapes HTML text", () => {
  const store = setup();
  store.apply({
    version: "v0.9",
    updateComponents: {
      surfaceId: "s",
      components: [
        { id: "root", component: "Column", children: ["root", "html"] },
        { id: "html", component: "Text", text: "<script>alert(1)</script>" },
      ],
    },
  });
  const { container } = render(
    <A2UISurface store={store} surfaceId="s" onAction={() => {}} />,
  );
  expect(screen.getByRole("alert").textContent).toContain("graph");
  expect(container.querySelector("script")).toBeNull();
});
it("resolves list template relative bindings and progressive missing references", () => {
  const store = new A2UIStore();
  store.apply({
    version: "v0.9.1",
    createSurface: { surfaceId: "s", catalogId: CATALOG_ID },
  });
  store.apply({
    version: "v0.9.1",
    updateComponents: {
      surfaceId: "s",
      components: [
        { id: "root", component: "Column", children: ["items", "later"] },
        {
          id: "items",
          component: "List",
          children: { componentId: "item", path: "/students" },
        },
        { id: "item", component: "Text", text: { path: "name" } },
      ],
    },
  });
  store.apply({
    version: "v0.9.1",
    updateDataModel: {
      surfaceId: "s",
      value: { students: [{ name: "Ada" }, { name: "Lin" }] },
    },
  });
  render(<A2UISurface store={store} surfaceId="s" onAction={() => {}} />);
  expect(screen.getByText("Ada")).toBeDefined();
  expect(screen.getByText("Lin")).toBeDefined();
  expect(screen.getByText("Loading component…")).toBeDefined();
});
it("rejects unsafe binding pointers before rendering", () => {
  const store = setup();
  expect(() =>
    store.apply({
      version: "v0.9.1",
      updateComponents: {
        surfaceId: "s",
        components: [
          { id: "root", component: "Text", text: { path: "/constructor/x" } },
        ],
      },
    }),
  ).toThrow();
});
