import { writeFileSync, mkdirSync } from "node:fs";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  componentSchema,
  messageSchema,
  CATALOG_ID,
} from "../dist/protocol.js";
mkdirSync("schemas", { recursive: true });
const catalog = zodToJsonSchema(componentSchema, "anyComponent");
catalog.$id = CATALOG_ID;
catalog.catalogId = CATALOG_ID;
writeFileSync("schemas/catalog.json", JSON.stringify(catalog, null, 2) + "\n");
writeFileSync(
  "schemas/messages.json",
  JSON.stringify(zodToJsonSchema(messageSchema, "Message"), null, 2) + "\n",
);
