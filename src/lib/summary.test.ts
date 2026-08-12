import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, categorize, seedRules, suggestPattern } from "./categories";
import {
  OTHER_SLICE_ID,
  applyFilter,
  byMonth,
  foldCategories,
  periodPresets,
  resolvePeriod,
  spendingByCategory,
  totals,
} from "./summary";
import type { Transaction } from "./types";

const categories = DEFAULT_CATEGORIES;

let counter = 0;
function txn(
  date: string,
  description: string,
  amountCents: number,
  categoryId = "shopping",
): Transaction {
  return {
    id: `t${counter++}`,
    accountId: "acct",
    date,
    description,
    amountCents,
    categoryId,
    categorySource: "rule",
  };
}

describe("totals", () => {
  it("reports money in and out as positive numbers, netting to their difference", () => {
    const rows = [
      txn("2026-08-01", "COSTCO", -62025, "groceries"),
      txn("2026-08-02", "PAYCHECK", 300000, "income"),
      txn("2026-08-03", "LOWES REFUND", 756, "home"),
    ];
    const result = totals(rows, categories);
    expect(result.outCents).toBe(62025);
    expect(result.inCents).toBe(300756);
    expect(result.netCents).toBe(238731);
  });

  it("excludes transfers from both sides so a card payment isn't counted as spending", () => {
    const rows = [
      txn("2026-08-01", "TARGET", -5000, "shopping"),
      txn("2026-08-05", "CITI CARD ONLINE PAYMENT", -5000, "transfer"),
    ];
    const result = totals(rows, categories);
    // Only the purchase counts; the payment that settles it is not new spending.
    expect(result.outCents).toBe(5000);
    expect(result.transferCents).toBe(5000);
    expect(result.netCents).toBe(-5000);
  });
});

describe("spendingByCategory", () => {
  it("ranks categories by spend and computes shares over spending only", () => {
    const rows = [
      txn("2026-08-01", "TJ", -3000, "groceries"),
      txn("2026-08-02", "TJ", -1000, "groceries"),
      txn("2026-08-03", "SHELL", -1000, "gas"),
      txn("2026-08-04", "PAYCHECK", 500000, "income"),
      txn("2026-08-05", "CARD PMT", -9999, "transfer"),
    ];
    const result = spendingByCategory(rows, categories);
    expect(result.map((r) => r.categoryId)).toEqual(["groceries", "gas"]);
    expect(result[0]!.cents).toBe(4000);
    expect(result[0]!.share).toBeCloseTo(0.8);
    expect(result[1]!.share).toBeCloseTo(0.2);
  });

  it("nets a refund against its category instead of inflating the total", () => {
    const rows = [
      txn("2026-08-01", "LOWES", -10000, "home"),
      txn("2026-08-09", "LOWES REFUND", 4000, "home"),
    ];
    const result = spendingByCategory(rows, categories);
    expect(result[0]!.cents).toBe(6000);
  });

  it("drops a category that was refunded more than it was spent", () => {
    const rows = [
      txn("2026-08-01", "SOFA", -10000, "home"),
      txn("2026-08-09", "SOFA RETURN", 12000, "home"),
    ];
    // A negative bar would misstate the chart, so the category is omitted.
    expect(spendingByCategory(rows, categories)).toEqual([]);
  });
});

describe("byMonth", () => {
  it("includes months with no activity so a gap stays visible", () => {
    const rows = [
      txn("2026-06-15", "A", -1000),
      txn("2026-08-15", "B", -2000),
    ];
    const result = byMonth(rows, categories);
    expect(result.map((r) => r.month)).toEqual(["2026-06", "2026-07", "2026-08"]);
    expect(result[1]!.outCents).toBe(0);
  });
});

describe("applyFilter", () => {
  const rows = [
    txn("2026-07-01", "COSTCO WHSE", -1000),
    txn("2026-08-15", "TRADER JOE S", -2000),
    txn("2026-08-20", "PAYCHECK", 5000, "income"),
  ];

  it("filters by inclusive date range", () => {
    const result = applyFilter(rows, { period: { start: "2026-08-01", end: "2026-08-15" } });
    expect(result).toHaveLength(1);
    expect(result[0]!.description).toBe("TRADER JOE S");
  });

  it("searches payees case-insensitively", () => {
    const result = applyFilter(rows, {
      period: { start: "1900-01-01", end: "2200-01-01" },
      query: "costco",
    });
    expect(result).toHaveLength(1);
  });

  it("filters by direction", () => {
    const out = applyFilter(rows, {
      period: { start: "1900-01-01", end: "2200-01-01" },
      direction: "out",
    });
    expect(out).toHaveLength(2);
    const inbound = applyFilter(rows, {
      period: { start: "1900-01-01", end: "2200-01-01" },
      direction: "in",
    });
    expect(inbound).toHaveLength(1);
  });
});

describe("foldCategories", () => {
  const ranked = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      categoryId: `c${i}`,
      name: `C${i}`,
      cents: (count - i) * 100,
      count: 1,
      share: 1 / count,
    }));

  it("leaves a short list alone", () => {
    expect(foldCategories(ranked(5)).map((s) => s.categoryId)).toEqual([
      "c0",
      "c1",
      "c2",
      "c3",
      "c4",
    ]);
  });

  it("folds the tail into one Other slice that remembers its members", () => {
    const slices = foldCategories(ranked(10), 4);
    expect(slices).toHaveLength(4);
    const other = slices[3]!;
    expect(other.categoryId).toBe(OTHER_SLICE_ID);
    expect(other.members).toEqual(["c3", "c4", "c5", "c6", "c7", "c8", "c9"]);
    // Nothing is lost in the fold: the wedges still sum to the whole.
    expect(slices.reduce((sum, s) => sum + s.cents, 0)).toBe(
      ranked(10).reduce((sum, r) => sum + r.cents, 0),
    );
  });
});

describe("period presets", () => {
  const presets = periodPresets("2026-08-12");

  it("offers exactly the five spans, anchored on the latest data", () => {
    expect(presets.map((p) => p.id)).toEqual([
      "this-month",
      "last-month",
      "ytd",
      "last-year",
      "all",
    ]);
    expect(presets[0]).toMatchObject({ start: "2026-08-01", end: "2026-08-31" });
    expect(presets[1]).toMatchObject({ start: "2026-07-01", end: "2026-07-31" });
    expect(presets[2]).toMatchObject({ start: "2026-01-01", end: "2026-08-12" });
    expect(presets[3]).toMatchObject({ start: "2025-01-01", end: "2025-12-31" });
  });

  it("falls back to all time when the URL carries an id it doesn't know", () => {
    expect(resolvePeriod("12m", presets).id).toBe("all");
  });

  it("treats a half-typed custom range as open-ended, and swaps a backwards one", () => {
    expect(resolvePeriod("custom", presets, { start: "2026-03-01" })).toMatchObject({
      start: "2026-03-01",
      end: "2200-12-31",
    });
    expect(
      resolvePeriod("custom", presets, { start: "2026-06-30", end: "2026-01-01" }),
    ).toMatchObject({ start: "2026-01-01", end: "2026-06-30" });
  });
});

describe("categorize", () => {
  const rules = seedRules();

  it("matches seeded merchant patterns from the sample files", () => {
    expect(categorize("TRADER JOE S #259", -2246, rules).categoryId).toBe("groceries");
    expect(categorize("IN-N-OUT SAN MARCOS", -1697, rules).categoryId).toBe("dining");
    expect(categorize("CIRCLEK #2701984 VISTA CA", -3067, rules).categoryId).toBe("gas");
    expect(categorize("COSTCO WHSE #0462 CARLSBAD CA", -62025, rules).categoryId).toBe("groceries");
    expect(categorize("PNC MORTGAGE ONLINE PMT 260803", -340000, rules).categoryId).toBe("housing");
  });

  it("prefers the longer, more specific pattern", () => {
    // "amazon prime" must win over a bare "amazon".
    expect(categorize("AMAZON PRIME*XY12", -1499, rules).categoryId).toBe("subscriptions");
    expect(categorize("AMAZON MKTPL*5N5486U51", -1882, rules).categoryId).toBe("shopping");
  });

  it("lets a user rule beat a seeded one", () => {
    const withUser = [
      ...rules,
      { id: "u1", pattern: "costco", categoryId: "shopping", createdAt: "2026-08-01" },
    ];
    expect(categorize("COSTCO WHSE #0462", -62025, withUser).categoryId).toBe("shopping");
  });

  it("falls back to the bank's own label when no rule matches", () => {
    const result = categorize("SOME LOCAL SHOP", -1000, [], "Merchandise");
    expect(result).toEqual({ categoryId: "shopping", source: "bank" });
  });

  it("treats an unmatched inflow as income rather than uncategorized", () => {
    expect(categorize("MYSTERY CREDIT", 5000, []).categoryId).toBe("income");
  });

  it("treats credit-card payments as transfers, not spending", () => {
    // The purchases these settle are already itemised on the card's own
    // statement, so counting the payment too would double the spend total.
    for (const payee of [
      "CITIBANK CRDT CD ONLINE PMT 260723",
      "CAPITAL ONE CARD ONLINE PMT 260720",
      "DISCOVER CARD ONLINE PMT 260727",
      "DISCOVER (CONA) NET/MOBILE",
      "CHASE CARD SERV ONLINE PMT 260703",
      "PAYMENT THANK YOU - MOBILE",
    ]) {
      expect(categorize(payee, -50000, rules).categoryId, payee).toBe("transfer");
    }
  });

  it("keeps loan, utility, and insurance payments as real spending", () => {
    // These share the "ONLINE PMT" wording with card payments but are genuine
    // costs — nothing else itemises them.
    expect(categorize("MAZDA AUTO-RETAI ONLINE PMT 260717", -35000, rules).categoryId).toBe("loans");
    expect(categorize("SDG&E ONLINE PMT 260720", -33456, rules).categoryId).toBe("utilities");
    expect(categorize("VISTA IRRIGATION ONLINE PMT 260623", -47731, rules).categoryId).toBe("utilities");
    expect(categorize("AAA INSURANCE PAYMENT 260707~ Tran: ACHD", -27898, rules).categoryId).toBe("insurance");
  });

  it("matches the payee spellings real statements actually use", () => {
    const cases: [string, string][] = [
      ["TST*TANNERS PRIME BURGE Oceanside CA", "dining"],
      ["CTLP*CANTEEN VENDING CHARLOTTE NC", "dining"],
      ["WM SUPERCENTER #2094 VISTA CA", "shopping"],
      ["VZWRLSS*APOCC VISW 800-922-0204", "utilities"],
      ["USAACATM19 ...795 SHADOW R VISTA", "cash"],
      ["ALASKA AIR 0272146014397SEATTLE WA", "travel"],
      ["GROCERY OUTLET OF O OCEANSIDE CA", "groceries"],
      ["PETS PLUS STORE 7 VISTA CA", "pets"],
      ["APPLE.COM/BILL CA", "subscriptions"],
      ["SUPERSTARCARWASH-MELROSE CA", "transport"],
      ["FERRELL*GAS LP 888-337-7355 MO", "utilities"],
      ["COSTCO CASH REWARD 260301", "income"],
    ];
    for (const [payee, expected] of cases) {
      expect(categorize(payee, -1000, rules).categoryId, payee).toBe(expected);
    }
  });

  it("does not let short patterns claim unrelated payees", () => {
    // Guards the substring hazards: bare "zoo" would claim ZOOM, and bare
    // "inn " would claim WINN DIXIE.
    expect(categorize("ZOOM.US 888-799-9666", -1499, rules).categoryId).not.toBe("entertainment");
    expect(categorize("WINN DIXIE #1234 ORLANDO FL", -4210, rules).categoryId).not.toBe("travel");
  });

  it("leaves an unmatched outflow uncategorized", () => {
    expect(categorize("UNKNOWN VENDOR XYZ", -1000, [])).toEqual({
      categoryId: "uncategorized",
      source: "none",
    });
  });
});

describe("suggestPattern", () => {
  it("strips store numbers and city noise to a reusable stem", () => {
    expect(suggestPattern("COSTCO WHSE #0462 CARLSBAD CA")).toBe("costco whse");
    expect(suggestPattern("TRADER JOE S #259")).toBe("trader joe");
    expect(suggestPattern("CIRCLEK #2701984 VISTA CA")).toBe("circlek vista");
  });
});
