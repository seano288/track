import { Match, Show, Switch, createMemo } from "solid-js";
import { useApp } from "./store";
import { Overview } from "./components/Overview";
import { ImportPanel } from "./components/ImportPanel";
import { Settings } from "./components/Settings";
import { urlParam } from "./lib/url-state";

const TABS: [string, string][] = [
  ["overview", "Overview"],
  ["import", "Import"],
  ["settings", "Settings"],
];

export function App() {
  const { state, loaded } = useApp();
  // In the URL like everything else, so a link can point at the Import tab.
  const [tab, setTab] = urlParam("tab", "overview");

  const hasData = createMemo(() => state.transactions.length > 0);

  return (
    <div class="app">
      <header class="topbar">
        <div class="brand">
          <strong>Track</strong>
          <span>spending, from your own statements</span>
        </div>
        <nav class="tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button role="tab" aria-selected={tab() === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      <Show when={loaded()} fallback={<p class="muted">Loading your data…</p>}>
        <Show
          when={hasData() || tab() !== "overview"}
          fallback={
            <div class="empty">
              <h2>Nothing here yet</h2>
              <p>
                Track reads CSV exports from your bank and card accounts and shows you where
                the money went. Nothing leaves this browser.
              </p>
              <button class="btn btn-primary" onClick={() => setTab("import")}>
                Import a CSV
              </button>
            </div>
          }
        >
          <Switch>
            <Match when={tab() === "import"}>
              <ImportPanel onImported={() => undefined} />
            </Match>
            <Match when={tab() === "settings"}>
              <Settings />
            </Match>
            <Match when={true}>
              <Overview />
            </Match>
          </Switch>
        </Show>
      </Show>
    </div>
  );
}
