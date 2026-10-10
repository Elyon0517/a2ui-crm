import { CATALOG_ID, type Component, type Message } from "./protocol";
/** Structural interface: consumers can pass their existing PanelV2Snapshot without importing CRM internals. */
export interface CoachSnapshot {
  mode: string;
  evidence_cards: Array<{
    evidence_id: string;
    label: string;
    excerpt: string;
    deep_link: string;
  }>;
  pattern_cards: Array<{
    memory_id: string;
    claim: string;
    confidence: number;
    adaptation: string;
  }>;
  action_cards: Array<{
    observation: string;
    next_action: string;
    title?: string | null;
    task_id?: string | null;
    deep_link?: string | null;
  }>;
}
export function coachToMessages(
  snapshot: CoachSnapshot,
  surfaceId = "coach",
): Message[] {
  const children: string[] = ["heading"];
  const components: Component[] = [
    {
      id: "heading",
      component: "Text",
      text: `AI Coach · ${snapshot.mode}`,
      variant: "h2",
    },
  ];
  snapshot.pattern_cards.forEach((p, i) => {
    const id = `pattern-${i}`;
    children.push(id);
    components.push({
      id,
      component: "Notice",
      text: `${p.claim}\n${p.adaptation} (${Math.round(p.confidence * 100)}%)`,
    });
  });
  snapshot.evidence_cards.forEach((e, i) => {
    const id = `evidence-${i}`;
    children.push(id);
    components.push({
      id,
      component: "EvidenceCard",
      label: e.label,
      excerpt: e.excerpt,
      action: {
        event: {
          name: "viewEvidence",
          context: { evidenceId: e.evidence_id, deepLink: e.deep_link },
        },
      },
    });
  });
  snapshot.action_cards.forEach((a, i) => {
    const id = `action-${i}`;
    children.push(id);
    components.push(
      { id, component: "Column", children: [`${id}-text`, `${id}-button`] },
      {
        id: `${id}-text`,
        component: "Text",
        text: `${a.observation}\n${a.next_action}`,
      },
      {
        id: `${id}-label`,
        component: "Text",
        text: a.title || "Start practice",
      },
      {
        id: `${id}-button`,
        component: "Button",
        child: `${id}-label`,
        disabled: !a.task_id || !a.deep_link,
        action: {
          event: {
            name: "startTask",
            context: { taskId: a.task_id ?? "", deepLink: a.deep_link ?? "" },
          },
        },
      },
    );
  });
  if (children.length === 1) {
    children.push("empty");
    components.push({
      id: "empty",
      component: "Notice",
      text: "No evidence available yet.",
    });
  }
  components.unshift({ id: "root", component: "Column", children });
  return [
    { version: "v0.9", createSurface: { surfaceId, catalogId: CATALOG_ID } },
    { version: "v0.9", updateComponents: { surfaceId, components } },
  ];
}
/** Navigation policy is enforced by the host, never by model-generated hrefs. */
export function safeCRMPath(
  value: unknown,
  allowedPrefixes: readonly string[],
): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/u.test(value)
  )
    throw new Error("Unsafe CRM path");
  const url = new URL(value, "https://crm.invalid");
  if (
    url.origin !== "https://crm.invalid" ||
    !allowedPrefixes.some(
      (p) => url.pathname === p || url.pathname.startsWith(`${p}/`),
    )
  )
    throw new Error("CRM route is not allowed");
  return url.pathname + url.search + url.hash;
}
