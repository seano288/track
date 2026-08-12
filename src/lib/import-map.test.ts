import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFile, buildTransactions } from "./import-map";
import { parseMoneyCents, combineDebitCredit, formatMoney } from "./money";
import { parseDate, monthRange, addMonths } from "./dates";
import { parseCsv } from "./csv";

const sample = (name: string) =>
  readFileSync(join(process.cwd(), "sample", name), "utf8");

describe("parseMoneyCents", () => {
  it("reads the formats the sample banks use", () => {
    expect(parseMoneyCents("22.46")).toBe(2246);
    expect(parseMoneyCents("$587.94")).toBe(58794);
    expect(parseMoneyCents("$1,738.99")).toBe(173899);
    expect(parseMoneyCents("-7.56")).toBe(-756);
    expect(parseMoneyCents("$0.01")).toBe(1);
    expect(parseMoneyCents("0")).toBe(0);
  });

  it("distinguishes an absent value from a real zero", () => {
    expect(parseMoneyCents("")).toBeNull();
    expect(parseMoneyCents(undefined)).toBeNull();
    expect(parseMoneyCents("-")).toBeNull();
    expect(parseMoneyCents("0")).toBe(0);
  });

  it("handles accounting negatives and european decimals", () => {
    expect(parseMoneyCents("(35.00)")).toBe(-3500);
    expect(parseMoneyCents("1.234,56")).toBe(123456);
    expect(parseMoneyCents("1,23")).toBe(123);
  });

  it("does not drift on large sums the way floats do", () => {
    const cents = [1010, 2020, 3030].reduce((a, b) => a + b, 0);
    expect(cents).toBe(6060);
    expect(formatMoney(-6060)).toBe("-$60.60");
  });
});

describe("combineDebitCredit", () => {
  it("signs a debit as money out and a credit as money in", () => {
    expect(combineDebitCredit("22.46", "")).toBe(-2246);
    expect(combineDebitCredit("", "150.00")).toBe(15000);
  });

  it("treats a zero on the unused side as absent (Discover)", () => {
    expect(combineDebitCredit("$35.00", "0")).toBe(-3500);
    expect(combineDebitCredit("0", "$3.24")).toBe(324);
  });

  it("reads Citi's negative credit as an inflow, not a second outflow", () => {
    // Citi writes a refund as -7.56 in the Credit column.
    expect(combineDebitCredit("", "-7.56")).toBe(756);
  });
});

describe("parseDate", () => {
  it("reads ISO and US formats", () => {
    expect(parseDate("2026-08-03")).toBe("2026-08-03");
    expect(parseDate("08/03/2026")).toBe("2026-08-03");
    expect(parseDate("8/3/26")).toBe("2026-08-03");
  });

  it("honours dayFirst only when asked", () => {
    expect(parseDate("03/08/2026")).toBe("2026-03-08");
    expect(parseDate("03/08/2026", true)).toBe("2026-08-03");
    // 25 can't be a month, so it's a day either way.
    expect(parseDate("25/08/2026")).toBe("2026-08-25");
  });

  it("rejects non-dates and impossible dates", () => {
    expect(parseDate("Description")).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate("2026-02-30")).toBeNull();
  });
});

describe("csv", () => {
  it("keeps commas inside quoted fields", () => {
    const rows = parseCsv('a,"b,c",d\n1,"2,3",4');
    expect(rows[0]).toEqual(["a", "b,c", "d"]);
    expect(rows[1]).toEqual(["1", "2,3", "4"]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsv('"say ""hi""",2')[0]).toEqual(['say "hi"', "2"]);
  });
});

describe("date helpers", () => {
  it("walks month ranges inclusively", () => {
    expect(monthRange("2026-06", "2026-08")).toEqual(["2026-06", "2026-07", "2026-08"]);
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });
});

describe("detecting each sample bank's layout", () => {
  it("maps Capital One (ISO dates, Debit/Credit, bank category)", () => {
    const { header, mapping, dataRows } = parseFile(sample("capitalone.csv"));
    expect(mapping.hasHeader).toBe(true);
    // Must prefer "Transaction Date" over "Posted Date".
    expect(header[mapping.date]).toBe("Transaction Date");
    expect(header[mapping.description]).toBe("Description");
    expect(header[mapping.debit!]).toBe("Debit");
    expect(header[mapping.credit!]).toBe("Credit");
    expect(header[mapping.category!]).toBe("Category");

    const { transactions, skipped } = buildTransactions(dataRows, mapping, "a1");
    expect(skipped).toEqual([]);
    expect(transactions[0]).toMatchObject({
      date: "2026-08-03",
      description: "TRADER JOE S #259",
      amountCents: -2246,
      bankCategory: "Merchandise",
    });
  });

  it("maps Citi and reads its negative credits as refunds", () => {
    const { header, mapping, dataRows } = parseFile(sample("citi.csv"));
    expect(header[mapping.date]).toBe("Date");
    expect(header[mapping.description]).toBe("Description");
    expect(header[mapping.debit!]).toBe("Debit");
    expect(header[mapping.credit!]).toBe("Credit");
    // "Member Name" and "Status" must not be taken for the description.
    expect(header[mapping.description]).not.toBe("Member Name");

    const { transactions, skipped } = buildTransactions(dataRows, mapping, "a2");
    expect(skipped).toEqual([]);
    const lowes = transactions.find((t) => t.description.startsWith("LOWES"))!;
    expect(lowes.amountCents).toBe(756); // refund -> money in
    const costco = transactions.find((t) => t.description.startsWith("COSTCO"))!;
    expect(costco.amountCents).toBe(-62025);
  });

  it("maps Discover (currency symbols, 0 on the unused side, Balance ignored)", () => {
    const { header, mapping, dataRows } = parseFile(sample("discover.csv"));
    expect(header[mapping.date]).toBe("Transaction Date");
    expect(header[mapping.description]).toBe("Transaction Description");
    expect(header[mapping.debit!]).toBe("Debit");
    expect(header[mapping.credit!]).toBe("Credit");
    // Balance is money-shaped but must never be read as an amount.
    expect(mapping.amount).toBeUndefined();

    const { transactions, skipped } = buildTransactions(dataRows, mapping, "a3");
    expect(skipped).toEqual([]);
    expect(transactions[0]).toMatchObject({
      date: "2026-07-31",
      amountCents: -3500,
    });
    const deposit = transactions.find((t) => t.description.includes("From PAYPAL"))!;
    expect(deposit.amountCents).toBe(324);
  });

  it("maps Schwab (fully quoted, Withdrawal/Deposit, thousands commas)", () => {
    const { header, mapping, dataRows } = parseFile(sample("schwab.csv"));
    expect(header[mapping.date]).toBe("Date");
    expect(header[mapping.description]).toBe("Description");
    expect(header[mapping.debit!]).toBe("Withdrawal");
    expect(header[mapping.credit!]).toBe("Deposit");

    const { transactions, skipped } = buildTransactions(dataRows, mapping, "a4");
    expect(skipped).toEqual([]);
    expect(transactions[0]).toMatchObject({
      date: "2026-08-04",
      description: "TARGET ONLINE PMT 260804",
      amountCents: -58794,
    });
    const mortgage = transactions.find((t) => t.description.includes("MORTGAGE"))!;
    expect(mortgage.amountCents).toBe(-340000);
    const interest = transactions.find((t) => t.description === "Interest Paid")!;
    expect(interest.amountCents).toBe(1);
  });

  it("reads every data row of every sample file", () => {
    for (const name of ["capitalone.csv", "citi.csv", "discover.csv", "schwab.csv"]) {
      const { dataRows, mapping } = parseFile(sample(name));
      const { transactions, skipped } = buildTransactions(dataRows, mapping, "acc");
      expect(skipped, `${name} had unreadable rows`).toEqual([]);
      expect(transactions.length, name).toBe(dataRows.length);
      // Every amount is a whole number of cents.
      expect(transactions.every((t) => Number.isInteger(t.amountCents))).toBe(true);
    }
  });
});

describe("dedupe ids", () => {
  it("gives the same row the same id across imports, so re-import is idempotent", () => {
    const { dataRows, mapping } = parseFile(sample("citi.csv"));
    const first = buildTransactions(dataRows, mapping, "acc").transactions;
    const again = buildTransactions(dataRows, mapping, "acc").transactions;
    expect(again.map((t) => t.id)).toEqual(first.map((t) => t.id));
    expect(new Set(first.map((t) => t.id)).size).toBe(first.length);
  });

  it("keeps two genuinely identical same-day charges as two transactions", () => {
    const rows = [
      ["08/02/2026", "CIRCLEK #2701984", "3.75", ""],
      ["08/02/2026", "CIRCLEK #2701984", "3.75", ""],
    ];
    const { transactions } = buildTransactions(
      rows,
      { date: 0, description: 1, debit: 2, credit: 3, hasHeader: false },
      "acc",
    );
    expect(transactions).toHaveLength(2);
    expect(transactions[0]!.id).not.toBe(transactions[1]!.id);
  });

  it("scopes ids to the account, so the same charge on two cards is two rows", () => {
    const rows = [["08/02/2026", "COSTCO", "10.00", ""]];
    const mapping = { date: 0, description: 1, debit: 2, credit: 3, hasHeader: false };
    const a = buildTransactions(rows, mapping, "acc-1").transactions[0]!;
    const b = buildTransactions(rows, mapping, "acc-2").transactions[0]!;
    expect(a.id).not.toBe(b.id);
  });
});

describe("single signed amount column (Chase/Amex shape)", () => {
  it("reads negative-as-outflow by default", () => {
    const text = "Date,Description,Amount\n08/03/2026,COFFEE,-4.50\n08/01/2026,PAYCHECK,2000.00\n";
    const { mapping, dataRows, header } = parseFile(text);
    expect(header[mapping.amount!]).toBe("Amount");
    const { transactions } = buildTransactions(dataRows, mapping, "acc");
    expect(transactions[0]!.amountCents).toBe(-450);
    expect(transactions[1]!.amountCents).toBe(200000);
  });

  it("flips when the export writes charges as positive (Amex)", () => {
    const text =
      "Date,Description,Amount\n" +
      ["12.00", "8.00", "40.00", "6.50", "22.00"]
        .map((a) => `08/0${["1", "2", "3", "4", "5"][0]}/2026,SHOP,${a}`)
        .join("\n");
    const { mapping } = parseFile(text);
    expect(mapping.amountSign).toBe("positive-is-outflow");
  });
});
