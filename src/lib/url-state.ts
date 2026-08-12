/**
 * View state in the URL, so a filtered view is a link.
 *
 * Everything lives in the hash rather than the query string: the site is static
 * and served from a GitHub Pages subpath, so a path-shaped URL would 404 on
 * reload. Values equal to their default are omitted, which keeps the common case
 * a bare `#` instead of a wall of `period=all&dir=all&sort=date`.
 */
import { createSignal } from "solid-js";

type Params = Record<string, string>;

function read(): Params {
  if (typeof window === "undefined") return {};
  const raw = window.location.hash.replace(/^#\/?/, "");
  const out: Params = {};
  for (const [key, value] of new URLSearchParams(raw)) out[key] = value;
  return out;
}

const [params, setParams] = createSignal<Params>(read());

if (typeof window !== "undefined") {
  // Covers both the back button and a pasted link into an already-open tab.
  window.addEventListener("hashchange", () => setParams(read()));
}

let timer: ReturnType<typeof setTimeout> | undefined;

function commit(next: Params) {
  setParams(next);
  if (typeof window === "undefined") return;
  clearTimeout(timer);
  // Coalesce keystrokes, and replace rather than push: typing in the search box
  // would otherwise bury the back button under fifty history entries.
  timer = setTimeout(() => {
    const search = new URLSearchParams(next).toString();
    const { pathname, search: query } = window.location;
    window.history.replaceState(null, "", `${pathname}${query}#${search}`);
  }, 120);
}

/**
 * A signal backed by one URL parameter. Reads reflect the current URL; writes
 * update it. `fallback` is both the value when the parameter is absent and the
 * value that is left out of the URL.
 */
export function urlParam(
  key: string,
  fallback: string,
): [() => string, (value: string) => void] {
  const get = () => params()[key] ?? fallback;
  const set = (value: string) => {
    const next = { ...params() };
    if (value === fallback || value === "") delete next[key];
    else next[key] = value;
    commit(next);
  };
  return [get, set];
}
