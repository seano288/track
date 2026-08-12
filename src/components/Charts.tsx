/**
 * The two charts, as inline SVG.
 *
 * Shared conventions, applied deliberately:
 *  - bars are capped at 24px thick with a 4px rounded data-end and a square
 *    baseline end, separated by a 2px gap in the surface colour rather than a
 *    stroke;
 *  - gridlines and axes are solid hairlines one step off the surface;
 *  - values are direct-labelled selectively, never on every mark, and axis ticks
 *    carry the rest;
 *  - every chart has a table twin, so no value is reachable only by hovering;
 *  - text always wears text tokens — identity comes from the coloured mark
 *    beside it, never from colouring the text.
 */
import { For, Show, createMemo, createSignal, type JSX } from "solid-js";
import { formatMoney, formatMoneyCompact } from "../lib/money";
import { formatMonth, formatMonthShort } from "../lib/dates";
import { OTHER_SLICE_ID, type CategorySlice, type CategoryTotal, type MonthTotal } from "../lib/summary";

const BAR_MAX = 24;
const GAP = 2;

/** Round an axis maximum up to a clean number so ticks read 0 / 1,000 / 2,000. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    if (value <= magnitude * step) return magnitude * step;
  }
  return magnitude * 10;
}

interface Hover {
  x: number;
  y: number;
  title: string;
  rows: [string, string][];
}

function Tooltip(props: { hover: Hover | null }) {
  return (
    <Show when={props.hover}>
      {(hover) => (
        <div class="tooltip" style={{ left: `${hover().x}px`, top: `${hover().y}px` }}>
          <div class="tt-title">{hover().title}</div>
          <For each={hover().rows}>
            {([label, value]) => (
              <div class="tt-row">
                <span>{label}</span>
                <span>{value}</span>
              </div>
            )}
          </For>
        </div>
      )}
    </Show>
  );
}

/**
 * Money in and out per month, as diverging columns around a zero baseline.
 *
 * Diverging rather than two grouped series because the reader's question is
 * directional — did more arrive than left? Side-of-axis carries that, so colour
 * is a second, redundant channel rather than the only one.
 */
export function MonthlyFlowChart(props: { data: MonthTotal[] }) {
  const [hover, setHover] = createSignal<Hover | null>(null);

  const width = 720;
  const height = 240;
  const pad = { top: 16, right: 12, bottom: 26, left: 52 };

  const scale = createMemo(() => {
    const max = Math.max(
      1,
      ...props.data.map((d) => Math.max(d.inCents, d.outCents)),
    );
    return niceMax(max);
  });

  const plotHeight = height - pad.top - pad.bottom;
  const zeroY = () => pad.top + plotHeight / 2;
  const halfHeight = () => plotHeight / 2;

  const band = createMemo(() =>
    props.data.length === 0 ? 0 : (width - pad.left - pad.right) / props.data.length,
  );
  const barWidth = createMemo(() => Math.min(BAR_MAX, Math.max(3, band() - GAP * 2)));

  /** A bar with its data-end rounded 4px and its baseline end square. */
  const barPath = (x: number, w: number, top: number, bottom: number, up: boolean) => {
    const h = Math.max(0, bottom - top);
    const r = Math.min(4, w / 2, h);
    return up
      ? `M${x},${bottom} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + w - r},${top} Q${x + w},${top} ${x + w},${top + r} L${x + w},${bottom} Z`
      : `M${x},${top} L${x},${bottom - r} Q${x},${bottom} ${x + r},${bottom} L${x + w - r},${bottom} Q${x + w},${bottom} ${x + w},${bottom - r} L${x + w},${top} Z`;
  };

  const ticks = createMemo(() => {
    const max = scale();
    return [max, max / 2, 0, -max / 2, -max].map((value) => ({
      value,
      y: zeroY() - (value / max) * halfHeight(),
    }));
  });

  // Label only the extreme month, so the labels stay readable.
  const peak = createMemo(() => {
    let best: MonthTotal | undefined;
    for (const d of props.data) if (!best || d.outCents > best.outCents) best = d;
    return best;
  });

  return (
    <div>
      <div class="legend">
        <span class="legend-item">
          <span class="swatch" style={{ background: "var(--flow-in)" }} />
          Money in
        </span>
        <span class="legend-item">
          <span class="swatch" style={{ background: "var(--flow-out)" }} />
          Money out
        </span>
      </div>

      <div class="chart-wrap" onMouseLeave={() => setHover(null)}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Money in and out by month"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Gridlines: solid hairlines, recessive. */}
            <For each={ticks()}>
              {(tick) => (
                <>
                  <line
                    x1={pad.left}
                    x2={width - pad.right}
                    y1={tick.y}
                    y2={tick.y}
                    stroke={tick.value === 0 ? "var(--baseline)" : "var(--gridline)"}
                    stroke-width="1"
                  />
                  <text x={pad.left - 8} y={tick.y + 3.5} text-anchor="end" class="tick">
                    {formatMoneyCompact(Math.abs(tick.value))}
                  </text>
                </>
              )}
            </For>

            <For each={props.data}>
              {(d, index) => {
                const x = () => pad.left + band() * index() + (band() - barWidth()) / 2;
                const inHeight = () => (d.inCents / scale()) * halfHeight();
                const outHeight = () => (d.outCents / scale()) * halfHeight();
                const isPeak = () => peak()?.month === d.month;
                return (
                  <>
                    {/* Hit area spans the whole band and clears 24px. */}
                    <rect
                      class="hit"
                      x={pad.left + band() * index()}
                      y={pad.top}
                      width={Math.max(band(), 1)}
                      height={plotHeight}
                      onMouseMove={() =>
                        setHover({
                          x: pad.left + band() * index() + band() / 2,
                          y: zeroY(),
                          title: formatMonth(d.month),
                          rows: [
                            ["Money in", formatMoney(d.inCents)],
                            ["Money out", formatMoney(d.outCents)],
                            ["Net", formatMoney(d.netCents)],
                          ],
                        })
                      }
                    />
                    <Show when={d.inCents > 0}>
                      <path
                        d={barPath(x(), barWidth(), zeroY() - inHeight(), zeroY() - GAP / 2, true)}
                        fill="var(--flow-in)"
                      />
                    </Show>
                    <Show when={d.outCents > 0}>
                      <path
                        d={barPath(x(), barWidth(), zeroY() + GAP / 2, zeroY() + outHeight(), false)}
                        fill="var(--flow-out)"
                      />
                    </Show>
                    {/* Direct-label the heaviest month only. */}
                    <Show when={isPeak() && d.outCents > 0}>
                      <text
                        x={x() + barWidth() / 2}
                        y={zeroY() + outHeight() + 12}
                        text-anchor="middle"
                        class="bar-label"
                      >
                        {formatMoneyCompact(d.outCents)}
                      </text>
                    </Show>
                  </>
                );
              }}
            </For>

            {/* X axis: thin out labels when months get tight. */}
            <For each={props.data}>
              {(d, index) => (
                <Show
                  when={
                    props.data.length <= 14 ||
                    index() % Math.ceil(props.data.length / 12) === 0
                  }
                >
                  <text
                    x={pad.left + band() * index() + band() / 2}
                    y={height - 6}
                    text-anchor="middle"
                    class="tick"
                  >
                    {props.data.length <= 14
                      ? formatMonthShort(d.month)
                      : d.month.slice(2).replace("-", "/")}
                  </text>
                </Show>
              )}
            </For>
        </svg>
        <Tooltip hover={hover()} />
      </div>
    </div>
  );
}

/**
 * The monthly chart's table twin, newest month first. `spendOnly` drops the
 * income columns, which are structurally zero for a single category's trend.
 */
export function MonthTable(props: { data: MonthTotal[]; spendOnly?: boolean }) {
  return (
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <Show when={!props.spendOnly}>
              <th class="num">Money in</th>
            </Show>
            <th class="num">{props.spendOnly ? "Spent" : "Money out"}</th>
            <Show when={!props.spendOnly}>
              <th class="num">Net</th>
            </Show>
          </tr>
        </thead>
        <tbody>
          <For each={[...props.data].reverse()}>
            {(d) => (
              <tr>
                <td>{formatMonth(d.month)}</td>
                <Show when={!props.spendOnly}>
                  <td class="num">{formatMoney(d.inCents)}</td>
                </Show>
                <td class="num">{formatMoney(d.outCents)}</td>
                <Show when={!props.spendOnly}>
                  <td class="num">{formatMoney(d.netCents)}</td>
                </Show>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

/**
 * Spending as a donut, with the period's headline figures in the hole and the
 * category breakdown as its legend.
 *
 * A pie is a weak instrument for comparing similar shares — that's why the legend
 * beside it carries every amount and percentage as text, and why the tail folds
 * into one neutral "Other" wedge instead of becoming a dozen slivers. Wedges are
 * assigned hues in the palette's fixed order by rank, separated by a 2px gap in
 * the surface colour; "Other" is deliberately achromatic, since it is a fold
 * rather than an identity.
 */
const SLICE_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
];

/** A decimal below 10%, so a small category doesn't read as a flat "0%". */
function formatShare(share: number): string {
  const percent = share * 100;
  return `${percent.toFixed(percent < 10 ? 1 : 0)}%`;
}

export function sliceColor(index: number, categoryId?: string): string {
  if (categoryId === OTHER_SLICE_ID) return "var(--other-fill)";
  return SLICE_COLORS[index] ?? "var(--other-fill)";
}

/** The donut's table twin: every category, including the folded tail. */
export function CategoryTable(props: { data: CategoryTotal[] }) {
  return (
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th class="num">Spent</th>
            <th class="num">Share</th>
            <th class="num">Transactions</th>
          </tr>
        </thead>
        <tbody>
          <For each={props.data}>
            {(d) => (
              <tr>
                <td>{d.name}</td>
                <td class="num">{formatMoney(d.cents)}</td>
                <td class="num">{formatShare(d.share)}</td>
                <td class="num">{d.count}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

export function SpendingDonut(props: {
  /** At most eight, ranked largest first. */
  slices: CategorySlice[];
  /** Every category, for the legend tail. */
  all: CategoryTotal[];
  hero: { label: string; value: string; meta?: JSX.Element };
  selected?: string;
  onSelect: (categoryId: string) => void;
}) {
  const [hover, setHover] = createSignal<Hover | null>(null);
  const [showAll, setShowAll] = createSignal(false);

  const size = 240;
  const center = size / 2;
  const outer = 114;
  // Wide enough a hole for the headline figure to sit inside it without
  // colliding with the ring.
  const inner = 80;

  const total = createMemo(() => props.slices.reduce((sum, s) => sum + s.cents, 0));

  /** Cumulative start/end angles, clockwise from 12 o'clock. */
  const arcs = createMemo(() => {
    const sum = total();
    let angle = -Math.PI / 2;
    return props.slices.map((slice, index) => {
      const span = sum === 0 ? 0 : (slice.cents / sum) * Math.PI * 2;
      const arc = { slice, index, start: angle, end: angle + span };
      angle += span;
      return arc;
    });
  });

  const ringPath = (start: number, end: number) => {
    const point = (radius: number, angle: number) =>
      `${(center + radius * Math.cos(angle)).toFixed(2)},${(center + radius * Math.sin(angle)).toFixed(2)}`;
    const large = end - start > Math.PI ? 1 : 0;
    return [
      `M${point(outer, start)}`,
      `A${outer},${outer} 0 ${large} 1 ${point(outer, end)}`,
      `L${point(inner, end)}`,
      `A${inner},${inner} 0 ${large} 0 ${point(inner, start)}`,
      "Z",
    ].join(" ");
  };

  const dim = (categoryId: string) =>
    props.selected != null && props.selected !== categoryId;

  const tailRows = createMemo(() => {
    const shown = new Set(props.slices.map((s) => s.categoryId));
    return props.all.filter((row) => !shown.has(row.categoryId));
  });

  const hoverRows = (row: CategoryTotal): [string, string][] => [
    ["Spent", formatMoney(row.cents)],
    ["Share", `${(row.share * 100).toFixed(1)}%`],
    ["Transactions", String(row.count)],
  ];

  return (
        <div class="donut-layout">
          <div class="donut-side">
            <div class="chart-wrap donut-wrap" onMouseLeave={() => setHover(null)}>
              <svg
                viewBox={`0 0 ${size} ${size}`}
                role="img"
                aria-label="Spending by category"
                preserveAspectRatio="xMidYMid meet"
              >
                <Show
                  when={props.slices.length > 1}
                  fallback={
                    <circle
                      cx={center}
                      cy={center}
                      r={(outer + inner) / 2}
                      fill="none"
                      stroke={sliceColor(0, props.slices[0]?.categoryId)}
                      stroke-width={outer - inner}
                    />
                  }
                >
                  <For each={arcs()}>
                    {(arc) => (
                      <path
                        d={ringPath(arc.start, arc.end)}
                        fill={sliceColor(arc.index, arc.slice.categoryId)}
                        opacity={dim(arc.slice.categoryId) ? 0.3 : 1}
                        /* The gap between wedges is the surface colour, not a dark rule. */
                        stroke="var(--surface-1)"
                        stroke-width="2"
                        class="slice"
                        onMouseMove={(event) => {
                          const box = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
                          setHover({
                            x: event.clientX - box.left,
                            y: event.clientY - box.top,
                            title: arc.slice.name,
                            rows: hoverRows(arc.slice),
                          });
                        }}
                        onClick={() => props.onSelect(arc.slice.categoryId)}
                      />
                    )}
                  </For>
                </Show>
              </svg>
              <Tooltip hover={hover()} />
              {/* The hero figure sits in the hole: one headline number per view. */}
              <div class="donut-center">
                <div class="label">{props.hero.label}</div>
                <div class="value">{props.hero.value}</div>
                <Show when={props.hero.meta}>
                  <div class="meta">{props.hero.meta}</div>
                </Show>
              </div>
            </div>
          </div>

          {/* The legend is the breakdown: name, amount and share as text, so no
              value is hover-only and identity never rests on colour alone. */}
          <div class="cat-legend">
            <For each={props.slices}>
              {(slice, index) => (
                <button
                  class="cat-row"
                  aria-pressed={props.selected === slice.categoryId}
                  onClick={() => props.onSelect(slice.categoryId)}
                  onMouseEnter={() => setHover(null)}
                >
                  <span
                    class="swatch"
                    style={{ background: sliceColor(index(), slice.categoryId) }}
                  />
                  <span class="cat-label">{slice.name}</span>
                  <span class="cat-value">{formatMoney(slice.cents)}</span>
                  <span class="cat-share">{formatShare(slice.share)}</span>
                </button>
              )}
            </For>

            <Show when={tailRows().length > 0}>
              {/* A disclosure, not a labelled button: the caret pivots to point at
                  what it revealed. */}
              <button
                class="cat-more"
                aria-expanded={showAll()}
                onClick={() => setShowAll((v) => !v)}
              >
                <svg class="caret" viewBox="0 0 10 10" aria-hidden="true">
                  <path
                    d="M3.5 1.5 L7 5 L3.5 8.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                {tailRows().length} smaller categories
              </button>
              <Show when={showAll()}>
                <For each={tailRows()}>
                  {(row) => (
                    <button
                      class="cat-row tail"
                      aria-pressed={props.selected === row.categoryId}
                      onClick={() => props.onSelect(row.categoryId)}
                    >
                      <span class="swatch" style={{ background: "var(--other-fill)" }} />
                      <span class="cat-label">{row.name}</span>
                      <span class="cat-value">{formatMoney(row.cents)}</span>
                      <span class="cat-share">{formatShare(row.share)}</span>
                    </button>
                  )}
                </For>
              </Show>
            </Show>
          </div>
    </div>
  );
}

/**
 * A single category's spend month by month — the drill-down behind a bar.
 * One series, so no legend: the heading names what is plotted.
 */
export function CategoryTrend(props: { data: MonthTotal[]; label: string }) {
  const [hover, setHover] = createSignal<Hover | null>(null);
  const width = 720;
  const height = 150;
  const pad = { top: 14, right: 12, bottom: 24, left: 52 };

  const scale = createMemo(() => niceMax(Math.max(...props.data.map((d) => d.outCents), 1)));
  const plotHeight = height - pad.top - pad.bottom;
  const band = createMemo(() =>
    props.data.length === 0 ? 0 : (width - pad.left - pad.right) / props.data.length,
  );
  const barWidth = createMemo(() => Math.min(BAR_MAX, Math.max(3, band() - GAP * 2)));
  const baseY = pad.top + plotHeight;

  return (
    <div class="chart-wrap" onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${props.label} spending by month`}
        preserveAspectRatio="xMidYMid meet"
      >
        <For each={[scale(), scale() / 2, 0]}>
          {(value) => {
            const y = baseY - (value / scale()) * plotHeight;
            return (
              <>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y}
                  y2={y}
                  stroke={value === 0 ? "var(--baseline)" : "var(--gridline)"}
                  stroke-width="1"
                />
                <text x={pad.left - 8} y={y + 3.5} text-anchor="end" class="tick">
                  {formatMoneyCompact(value)}
                </text>
              </>
            );
          }}
        </For>
        <For each={props.data}>
          {(d, index) => {
            const x = () => pad.left + band() * index() + (band() - barWidth()) / 2;
            const barHeight = () => (d.outCents / scale()) * plotHeight;
            return (
              <>
                <rect
                  class="hit"
                  x={pad.left + band() * index()}
                  y={pad.top}
                  width={Math.max(band(), 1)}
                  height={plotHeight}
                  onMouseMove={() =>
                    setHover({
                      x: pad.left + band() * index() + band() / 2,
                      y: pad.top + plotHeight / 2,
                      title: formatMonth(d.month),
                      rows: [["Spent", formatMoney(d.outCents)]],
                    })
                  }
                />
                <Show when={d.outCents > 0}>
                  <rect
                    x={x()}
                    y={baseY - barHeight()}
                    width={barWidth()}
                    height={Math.max(barHeight(), 1)}
                    rx="4"
                    fill="var(--series-1)"
                  />
                  <rect
                    x={x()}
                    y={baseY - Math.min(4, barHeight())}
                    width={barWidth()}
                    height={Math.min(4, barHeight())}
                    fill="var(--series-1)"
                  />
                </Show>
              </>
            );
          }}
        </For>
        <For each={props.data}>
          {(d, index) => (
            <Show
              when={
                props.data.length <= 14 || index() % Math.ceil(props.data.length / 12) === 0
              }
            >
              <text
                x={pad.left + band() * index() + band() / 2}
                y={height - 5}
                text-anchor="middle"
                class="tick"
              >
                {formatMonthShort(d.month)}
              </text>
            </Show>
          )}
        </For>
      </svg>
      <Tooltip hover={hover()} />
    </div>
  );
}
