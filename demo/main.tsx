import { createRoot } from "react-dom/client";
import { useState } from "react";
import {
  A2UIStore,
  A2UISurface,
  coachToMessages,
  CATALOG_ID,
  type Action,
  type Message,
} from "../src";
import "../src/styles.css";
import "./style.css";
const store = new A2UIStore();
const snapshot = {
  mode: "learning",
  pattern_cards: [
    {
      memory_id: "demo",
      claim: "Your ideas are clear. Connect them with stronger transitions.",
      confidence: 0.86,
      adaptation: "Try a focused five-minute practice.",
    },
  ],
  evidence_cards: [
    {
      evidence_id: "sample-1",
      label: "Writing · paragraph 2",
      excerpt:
        "“Many people prefer to study alone. Group learning also has benefits.”",
      deep_link: "/student/writing/sample",
    },
  ],
  action_cards: [
    {
      observation: "Two sentences could use a linking phrase.",
      next_action: "Rewrite the paragraph with “however” or “in addition”.",
      title: "Start focused practice",
      task_id: "demo-task",
      deep_link: "/student/practice/demo-task",
    },
  ],
};
const form: Message[] = [
  {
    version: "v0.9",
    createSurface: {
      surfaceId: "plan",
      catalogId: CATALOG_ID,
      sendDataModel: true,
    },
  },
  {
    version: "v0.9",
    updateComponents: {
      surfaceId: "plan",
      components: [
        { id: "root", component: "Card", child: "fields" },
        {
          id: "fields",
          component: "Column",
          children: ["title", "goal", "duration", "save"],
        },
        {
          id: "title",
          component: "Text",
          text: "Your next learning goal",
          variant: "h2",
        },
        {
          id: "goal",
          component: "TextField",
          label: "Goal",
          value: { path: "/goal" },
          required: true,
        },
        {
          id: "duration",
          component: "ChoicePicker",
          label: "Daily practice",
          value: { path: "/duration" },
          options: [
            { label: "5 minutes", value: "5" },
            { label: "15 minutes", value: "15" },
          ],
        },
        { id: "save-label", component: "Text", text: "Preview plan" },
        {
          id: "save",
          component: "Button",
          child: "save-label",
          action: {
            event: {
              name: "previewPlan",
              context: {
                goal: { path: "/goal" },
                duration: { path: "/duration" },
              },
            },
          },
        },
      ],
    },
  },
  {
    version: "v0.9",
    updateDataModel: {
      surfaceId: "plan",
      value: { goal: "Improve IELTS transitions", duration: "5" },
    },
  },
];
function reset() {
  store.clear();
  [...coachToMessages(snapshot), ...form].forEach((m) => store.apply(m));
}
reset();
function App() {
  const [events, setEvents] = useState<Action[]>([]);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  return (
    <main>
      <header>
        <span>A2UI / CRM LAB</span>
        <h1>
          From agent insight
          <br />
          to useful action.
        </h1>
        <p>A trusted React catalog for the next generation of AI Coach.</p>
        <button onClick={() => { reset(); setEvents([]); setRaw(""); setError(""); }}>Reset demo</button>{" "}
        <a href="https://github.com/Elyon0517/a2ui-crm">
          Source & integration guide ↗
        </a>
      </header>
      <div className="demo-status" aria-label="Dashboard status">
        <div><strong>2</strong><span>Live React surfaces</span></div>
        <div><strong>JSON → UI</strong><span>Trusted component catalog</span></div>
        <div><strong>{events.length}</strong><span>Local action events</span></div>
      </div>
      <div className="grid">
        <article>
          <h3>01 · Evidence & actions</h3>
          <A2UISurface
            store={store}
            surfaceId="coach"
            allowedActions={["viewEvidence", "startTask"]}
            onAction={(e) => setEvents((v) => [e, ...v])}
          />
        </article>
        <article>
          <h3>02 · Bound learning plan</h3>
          <A2UISurface
            store={store}
            surfaceId="plan"
            allowedActions={["previewPlan"]}
            onAction={(e) => setEvents((v) => [e, ...v])}
          />
          <h3>Action inspector</h3>
          <pre>{JSON.stringify(events, null, 2)}</pre>
        </article>
      </div>
      <section>
        <h3>03 · Protocol playground</h3>
        <p>Paste one JSON message. Example: update /goal on surface “plan”.</p>
        <textarea
          aria-label="Protocol JSON"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={
            '{"version":"v0.9","updateDataModel":{"surfaceId":"plan","path":"/goal","value":"Practice speaking"}}'
          }
        />
        <button
          onClick={() => {
            try {
              store.apply(JSON.parse(raw));
              setError("");
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Apply message
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
      <footer>
        Synthetic demo data · No API key required · Actions are recorded locally
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
