import { render } from "solid-js/web";
import { App } from "./App";
import { AppProvider } from "./store";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

render(
  () => (
    <AppProvider>
      <App />
    </AppProvider>
  ),
  root,
);
