import { z } from "zod";
export const CATALOG_ID = "https://github.com/Elyon0517/a2ui-crm/catalog/v1";
const id = z
  .string()
  .min(1)
  .max(128)
  .refine(
    (v) => !["__proto__", "constructor", "prototype"].includes(v),
    "Unsafe identifier",
  );
const pointer = z
  .string()
  .max(1024)
  .refine((path) => {
    const keys = path.replace(/^\//, "").split("/");
    return (
      !/~(?![01])/u.test(path) &&
      keys.length <= 32 &&
      !keys.some((key) =>
        ["__proto__", "constructor", "prototype"].includes(
          key.replace(/~1/g, "/").replace(/~0/g, "~"),
        ),
      )
    );
  }, "Unsafe binding pointer");
export const binding = z.object({ path: pointer }).strict();
const str = z.union([z.string().max(10000), binding]);
const boolean = z.union([z.boolean(), binding]);
const action = z
  .object({
    event: z
      .object({
        name: id,
        context: z
          .record(
            z.union([z.string(), z.number(), z.boolean(), z.null(), binding]),
          )
          .default({}),
      })
      .strict(),
  })
  .strict();
const base = { id };
export const componentSchema = z.discriminatedUnion("component", [
  z
    .object({
      ...base,
      component: z.literal("Text"),
      text: str,
      variant: z.enum(["h2", "body", "caption"]).optional(),
    })
    .strict(),
  ...(["Row", "Column", "List"] as const).map((component) =>
    z
      .object({
        ...base,
        component: z.literal(component),
        children: z.union([
          z.array(id).max(500),
          z.object({ componentId: id, path: pointer }).strict(),
        ]),
      })
      .strict(),
  ),
  z.object({ ...base, component: z.literal("Card"), child: id }).strict(),
  z.object({ ...base, component: z.literal("Divider") }).strict(),
  z
    .object({
      ...base,
      component: z.literal("Button"),
      child: id,
      action,
      disabled: boolean.optional(),
    })
    .strict(),
  z
    .object({
      ...base,
      component: z.literal("TextField"),
      label: str,
      value: binding,
      required: z.boolean().optional(),
      variant: z.enum(["shortText", "longText"]).optional(),
    })
    .strict(),
  z
    .object({
      ...base,
      component: z.literal("CheckBox"),
      label: str,
      value: binding,
    })
    .strict(),
  z
    .object({
      ...base,
      component: z.literal("ChoicePicker"),
      label: str,
      value: binding,
      options: z
        .array(z.object({ label: z.string(), value: z.string() }).strict())
        .max(100),
    })
    .strict(),
  z
    .object({ ...base, component: z.literal("Metric"), label: str, value: str })
    .strict(),
  z
    .object({
      ...base,
      component: z.literal("EvidenceCard"),
      label: str,
      excerpt: str,
      action: action.optional(),
    })
    .strict(),
  z
    .object({
      ...base,
      component: z.literal("Notice"),
      text: str,
      tone: z.enum(["info", "success", "warning"]).optional(),
    })
    .strict(),
]);
const envelope = { version: z.enum(["v0.9", "v0.9.1"]) };
export const messageSchema = z.union([
  z
    .object({
      ...envelope,
      createSurface: z
        .object({
          surfaceId: id,
          catalogId: z.literal(CATALOG_ID),
          sendDataModel: z.boolean().optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...envelope,
      updateComponents: z
        .object({
          surfaceId: id,
          components: z.array(componentSchema).max(500),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...envelope,
      updateDataModel: z
        .object({
          surfaceId: id,
          path: pointer.optional(),
          value: z.unknown().optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...envelope,
      deleteSurface: z.object({ surfaceId: id }).strict(),
    })
    .strict(),
]);
export type Component = z.infer<typeof componentSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Action = {
  action: {
    name: string;
    surfaceId: string;
    sourceComponentId: string;
    timestamp: string;
    context: Record<string, unknown>;
  };
};
