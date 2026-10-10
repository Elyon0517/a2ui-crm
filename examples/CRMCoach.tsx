/** Copy into CRM; adjust the relative imports and route policy to your host. */
import { useEffect, useMemo, useState } from "react";
import {
  A2UIStore,
  A2UISurface,
  coachToMessages,
  safeCRMPath,
  type CoachSnapshot,
} from "@elyon/a2ui-crm";
import "@elyon/a2ui-crm/styles.css";
export function CRMCoach({
  snapshot,
  navigate,
}: {
  snapshot: CoachSnapshot;
  navigate: (path: string) => void;
}) {
  const store = useMemo(() => new A2UIStore(), []);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      store.clear();
      coachToMessages(snapshot).forEach((m) => store.apply(m));
      setError("");
    } catch (e) {
      setError(String(e));
    }
    return () => store.clear();
  }, [store, snapshot]);
  if (error)
    return (
      <p role="alert">
        Coach preview unavailable. Use the existing coach panel.
      </p>
    );
  return (
    <A2UISurface
      store={store}
      surfaceId="coach"
      allowedActions={["viewEvidence", "startTask"]}
      onAction={async ({ action }) => {
        // Navigation only. Real mutations must go through your authorized host hooks.
        if (action.name === "viewEvidence" || action.name === "startTask") {
          navigate(
            safeCRMPath(action.context.deepLink, [
              "/ielts-writing",
              "/speaking",
              "/practice/vocabulary",
              "/plan",
            ]),
          );
        }
      }}
    />
  );
}
