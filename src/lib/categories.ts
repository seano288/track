/**
 * Categories and the rules that assign them.
 *
 * Categories deliberately carry no colour. The two charts in this app encode
 * magnitude (bar length, sorted) and polarity (money in vs out), neither of
 * which is an identity encoding — so a dozen competing hues would add nothing
 * readable and would fail colour-blind separation past about eight anyway.
 */
import type { Category, Rule, Transaction } from "./types";

export const UNCATEGORIZED = "uncategorized";

/**
 * The category that takes one transaction out of the reckoning entirely — no
 * report counts it and the list leaves it out until you ask to see it.
 *
 * It exists for the rows a rule can never get right: a reimbursed work expense,
 * a duplicate a bank posted twice, a card payment the seed rules missed. Nothing
 * is deleted, so the raw record and the hidden pill are both still there.
 */
export const HIDDEN = "hidden";

/**
 * `spending` and `income` are summarised separately. `transfer` is excluded
 * from both: moving money from checking to a credit card isn't an expense, and
 * counting it would double-count the purchases that card already recorded.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "groceries", name: "Groceries", group: "spending" },
  { id: "dining", name: "Dining & Drinks", group: "spending" },
  { id: "gas", name: "Gas & Fuel", group: "spending" },
  { id: "transport", name: "Auto & Transport", group: "spending" },
  { id: "shopping", name: "Shopping", group: "spending" },
  { id: "housing", name: "Rent & Mortgage", group: "spending" },
  { id: "utilities", name: "Bills & Utilities", group: "spending" },
  { id: "home", name: "Home & Garden", group: "spending" },
  { id: "health", name: "Health & Medical", group: "spending" },
  { id: "entertainment", name: "Entertainment", group: "spending" },
  { id: "travel", name: "Travel", group: "spending" },
  { id: "subscriptions", name: "Subscriptions", group: "spending" },
  { id: "education", name: "Education & Kids", group: "spending" },
  { id: "pets", name: "Pets", group: "spending" },
  { id: "insurance", name: "Insurance", group: "spending" },
  { id: "loans", name: "Loan Payments", group: "spending" },
  { id: "giving", name: "Giving & Charity", group: "spending" },
  { id: "fees", name: "Fees & Interest", group: "spending" },
  { id: "cash", name: "Cash & ATM", group: "spending" },
  { id: "other", name: "Other", group: "spending" },
  { id: "income", name: "Income", group: "income" },
  { id: "transfer", name: "Transfer & Payment", group: "transfer" },
  { id: HIDDEN, name: "Hidden", group: "hidden" },
  { id: UNCATEGORIZED, name: "Uncategorized", group: "spending" },
];

/**
 * Seed rules: plain case-insensitive substrings matched against the payee.
 *
 * These are a starting point, not a fixed list — recategorising a transaction
 * in the UI offers to add a rule, and user rules are matched first.
 */
const SEED: [pattern: string, categoryId: string][] = [
  // --- Credit-card payments: transfers, not spending. ---
  // These matter more than any other rule here. A card payment leaving your
  // checking account is the same money as the purchases already itemised on the
  // card's own statement, so counting it as spending double-counts it — on the
  // sample data that was about a third of the reported total. Card issuers are
  // matched specifically rather than by a blanket "online pmt", because
  // utility, insurance, and loan payments share that wording and are real costs.
  ["crdt cd", "transfer"], ["citibank crdt", "transfer"], ["capital one card", "transfer"],
  // The same Discover card gets paid under two different wordings.
  ["discover card", "transfer"], ["discover (cona", "transfer"],
  ["chase card serv", "transfer"],
  ["card serv", "transfer"], ["amex epayment", "transfer"], ["american express ach", "transfer"],
  ["credit card pmt", "transfer"], ["payment thank you", "transfer"],
  ["autopay payment", "transfer"], ["bk of amer card", "transfer"],
  // Money moved between your own accounts or to people.
  ["online payment", "transfer"], ["autopay", "transfer"], ["pymt", "transfer"],
  ["transfer", "transfer"], ["venmo", "transfer"], ["zelle", "transfer"],
  ["paypal", "transfer"], ["cash app", "transfer"], ["ach withdrawal", "transfer"],

  // --- Groceries ---
  ["trader joe", "groceries"], ["safeway", "groceries"], ["whole foods", "groceries"],
  ["sprouts", "groceries"], ["ralphs", "groceries"], ["vons", "groceries"],
  ["aldi", "groceries"], ["kroger", "groceries"], ["albertsons", "groceries"],
  ["costco whse", "groceries"], ["costco wholesale", "groceries"], ["food 4 less", "groceries"],
  ["grocery outlet", "groceries"], ["frazier farms", "groceries"], ["jimbo's", "groceries"],
  ["seaside mar", "groceries"], ["stater bros", "groceries"], ["smart & final", "groceries"],
  ["7-eleven", "groceries"], ["farmers market", "groceries"],

  // --- Dining ---
  // "TST*" is Toast and "CTLP*" is Cantaloupe vending — both food-only
  // processors, so the prefix alone is a reliable signal.
  ["tst*", "dining"], ["ctlp*", "dining"], ["in-n-out", "dining"],
  ["starbucks", "dining"], ["chipotle", "dining"], ["mcdonald", "dining"],
  ["doordash", "dining"], ["uber eats", "dining"], ["grubhub", "dining"],
  ["taco bell", "dining"], ["subway", "dining"], ["panera", "dining"],
  ["dunkin", "dining"], ["pizza", "dining"], ["restaurant", "dining"],
  ["cafe", "dining"], ["coffee", "dining"], ["brewing", "dining"],
  ["brewery", "dining"], ["taqueria", "dining"], ["sushi", "dining"],
  ["liquor", "dining"], ["grill", "dining"], ["bakery", "dining"],
  ["burger", "dining"], ["deli", "dining"], ["juice", "dining"],
  ["vending", "dining"], ["bar & ", "dining"], ["tavern", "dining"],

  // --- Fuel ---
  ["circlek", "gas"], ["circle k", "gas"], ["chevron", "gas"], ["shell oil", "gas"],
  ["arco", "gas"], ["mobil", "gas"], ["valero", "gas"], ["exxon", "gas"],
  ["speedway", "gas"], ["costco gas", "gas"], ["loves ts", "gas"],
  ["pilot travel", "gas"], ["sunoco", "gas"], ["76 gas", "gas"],

  // --- Auto & transport ---
  ["uber trip", "transport"], ["lyft", "transport"], ["parking", "transport"],
  ["dmv", "transport"], ["jiffy lube", "transport"], ["autozone", "transport"],
  ["discount tire", "transport"], ["discount-tire", "transport"], ["toll road", "transport"],
  ["car wash", "transport"], ["carwash", "transport"], ["nctd", "transport"],
  ["pronto", "transport"], ["dulles daily", "transport"], ["norm reeves", "transport"],
  ["honda", "transport"], ["o'reilly auto", "transport"], ["smog", "transport"],
  ["auto parts", "transport"], ["oil change", "transport"], ["amtrak", "transport"],

  // --- Shopping ---
  ["amazon", "shopping"], ["amzn", "shopping"], ["target", "shopping"],
  ["walmart", "shopping"], ["wm supercenter", "shopping"], ["best buy", "shopping"],
  ["ebay", "shopping"], ["etsy", "shopping"], ["nordstrom", "shopping"],
  ["macy", "shopping"], ["old navy", "shopping"], ["nike", "shopping"],
  ["apple store", "shopping"], ["ikea", "shopping"], ["michaels stores", "shopping"],
  ["hobby-lobby", "shopping"], ["hobby lobby", "shopping"], ["dollar tree", "shopping"],
  ["uptown cheapskate", "shopping"], ["marshalls", "shopping"], ["tj maxx", "shopping"],
  ["ross stores", "shopping"], ["kohl", "shopping"], ["staples", "shopping"],
  ["office depot", "shopping"],

  // --- Home & garden ---
  ["lowes", "home"], ["home depot", "home"], ["ace hardware", "home"],
  ["sherwin", "home"], ["gardener", "home"], ["nursery", "home"],
  ["modern builders", "home"], ["harbor freight", "home"], ["pool suppl", "home"],

  // --- Housing ---
  ["mortgage", "housing"], ["rent ", "housing"], ["hoa ", "housing"],
  ["property tax", "housing"],

  // --- Bills & utilities ---
  ["sdg&e", "utilities"], ["sdge", "utilities"], ["edison", "utilities"],
  ["pg&e", "utilities"], ["water dist", "utilities"], ["irrigation", "utilities"],
  ["waste manage", "utilities"], ["republic services", "utilities"], ["at&t", "utilities"],
  ["verizon", "utilities"], ["vzwrlss", "utilities"], ["t-mobile", "utilities"],
  ["comcast", "utilities"], ["xfinity", "utilities"], ["spectrum", "utilities"],
  ["cox comm", "utilities"], ["ferrell", "utilities"], ["propane", "utilities"],
  ["sewer", "utilities"], ["trash", "utilities"],

  // --- Health ---
  ["cvs", "health"], ["walgreens", "health"], ["pharmacy", "health"],
  ["dental", "health"], ["dentist", "health"], ["medical", "health"],
  ["kaiser", "health"], ["optometry", "health"], ["hospital", "health"],
  ["clinic", "health"], ["urgent care", "health"], ["vision cent", "health"],
  ["orthodont", "health"], ["physical therapy", "health"],

  // --- Pets ---
  ["pets plus", "pets"], ["petco", "pets"], ["petsmart", "pets"],
  ["veterinar", "pets"], ["animal hospital", "pets"], ["chewy", "pets"],
  ["pet suppl", "pets"],

  // --- Insurance ---
  ["aaa insurance", "insurance"], ["insurance", "insurance"], ["united of omaha", "insurance"],
  ["geico", "insurance"], ["state farm", "insurance"], ["progressive ins", "insurance"],
  ["allstate", "insurance"],

  // --- Loan payments ---
  // A loan payment is real money out, unlike a card payment — the purchase it
  // financed was never itemised anywhere else.
  ["auto-retai", "loans"], ["auto loan", "loans"], ["student loan", "loans"],
  ["sallie mae", "loans"], ["nelnet", "loans"], ["loan pmt", "loans"],
  ["california cu online", "loans"],

  // --- Subscriptions & entertainment ---
  ["netflix", "subscriptions"], ["spotify", "subscriptions"], ["hulu", "subscriptions"],
  ["disney plus", "subscriptions"], ["youtube premium", "subscriptions"],
  ["patreon", "subscriptions"], ["audible", "subscriptions"], ["icloud", "subscriptions"],
  ["apple.com/bill", "subscriptions"], ["google storage", "subscriptions"],
  ["adobe", "subscriptions"], ["openai", "subscriptions"], ["anthropic", "subscriptions"],
  ["prime video", "subscriptions"], ["hbo", "subscriptions"], ["amazon prime", "subscriptions"],
  ["gym", "subscriptions"], ["fitness", "subscriptions"], ["planet fit", "subscriptions"],
  ["steam games", "entertainment"], ["nintendo", "entertainment"], ["playstation", "entertainment"],
  ["cinema", "entertainment"], ["amc ", "entertainment"], ["regal", "entertainment"],
  ["ticketmaster", "entertainment"], ["golf", "entertainment"], ["theater", "entertainment"],
  // " zoo" and " inn " keep their leading space on purpose: bare "zoo" would
  // claim "ZOOM", and bare "inn " would claim "WINN DIXIE".
  ["museum", "entertainment"], [" zoo", "entertainment"], ["ski resort", "entertainment"],

  // --- Travel ---
  ["airlines", "travel"], ["alaska air", "travel"], ["southwest air", "travel"],
  ["united air", "travel"], ["delta air", "travel"], ["american air", "travel"],
  ["hotel", "travel"], ["marriott", "travel"], ["hilton", "travel"],
  ["airbnb", "travel"], ["expedia", "travel"], ["hertz", "travel"],
  ["enterprise rent", "travel"], ["turo", "travel"], ["resort", "travel"],
  ["lodging", "travel"], ["catalina express", "travel"], ["amk ", "travel"],
  [" inn ", "travel"], ["motel", "travel"], ["holiday inn", "travel"],

  // --- Education & kids ---
  ["school", "education"], ["tuition", "education"], ["daycare", "education"],
  ["scholastic", "education"], ["preschool", "education"], ["kumon", "education"],

  // --- Giving ---
  ["church", "giving"], ["humane", "giving"], ["red cross", "giving"],
  ["donation", "giving"], ["goodwill", "giving"], ["charit", "giving"],

  // --- Fees & interest ---
  ["interest charge", "fees"], ["annual membership fee", "fees"], ["late fee", "fees"],
  ["foreign transaction fee", "fees"], ["overdraft", "fees"], ["service charge", "fees"],
  ["atm fee", "fees"], ["finance charge", "fees"], ["membership renewal", "fees"],

  // --- Cash & ATM ---
  ["atm withdrawal", "cash"], ["cash withdrawal", "cash"], ["atm", "cash"],
  ["bank of america *", "cash"], ["cash advance", "cash"],

  // --- Income ---
  ["payroll", "income"], ["direct dep", "income"], ["interest paid", "income"],
  ["interest earned", "income"], ["dividend", "income"], ["tax refund", "income"],
  ["irs treas", "income"], ["refund", "income"], ["rebate", "income"],
  ["cash reward", "income"],
];

export function seedRules(): Rule[] {
  return SEED.map(([pattern, categoryId], i) => ({
    id: `seed-${i}`,
    pattern,
    categoryId,
    createdAt: "seed",
  }));
}

/**
 * The bank's own category label mapped onto ours, for exports that supply one
 * (Capital One's Merchandise/Dining/Gas-Automotive, for instance).
 */
const BANK_CATEGORY_MAP: Record<string, string> = {
  merchandise: "shopping", dining: "dining", "gas/automotive": "gas",
  gas: "gas", automotive: "transport", grocery: "groceries", groceries: "groceries",
  "food & drink": "dining", travel: "travel", entertainment: "entertainment",
  health: "health", "health care": "health", healthcare: "health",
  "professional services": "other", "phone/cable": "utilities",
  utilities: "utilities", insurance: "other", fee: "fees", fees: "fees",
  "fee/interest charge": "fees", interest: "fees", payment: "transfer",
  payments: "transfer", "credit card payment": "transfer", transfer: "transfer",
  income: "income", deposit: "income", other: "other", "other services": "other",
  shopping: "shopping", home: "home", "home improvement": "home",
  education: "education", subscription: "subscriptions", services: "other",
};

/**
 * Choose a category for one transaction.
 *
 * Order matters: user rules beat seed rules (so correcting a mistake sticks),
 * rules beat the bank's own label (yours are more specific than "Merchandise"),
 * and an inflow with no match lands in Income rather than Uncategorized —
 * money arriving is almost never an expense waiting to be classified.
 */
export function categorize(
  description: string,
  amountCents: number,
  rules: Rule[],
  bankCategory?: string,
): { categoryId: string; source: Transaction["categorySource"] } {
  const haystack = description.toLowerCase();

  const userRules = rules.filter((r) => r.createdAt !== "seed");
  const seedRulesList = rules.filter((r) => r.createdAt === "seed");

  for (const group of [userRules, seedRulesList]) {
    // Longest pattern first: "amazon prime" should beat a bare "amazon".
    const ordered = [...group].sort((a, b) => b.pattern.length - a.pattern.length);
    for (const rule of ordered) {
      if (rule.pattern && haystack.includes(rule.pattern.toLowerCase())) {
        return { categoryId: rule.categoryId, source: "rule" };
      }
    }
  }

  if (bankCategory) {
    const mapped = BANK_CATEGORY_MAP[bankCategory.toLowerCase().trim()];
    if (mapped) return { categoryId: mapped, source: "bank" };
  }

  if (amountCents > 0) return { categoryId: "income", source: "rule" };

  return { categoryId: UNCATEGORIZED, source: "none" };
}

/**
 * A sensible rule pattern from a payee string: the leading words, minus the
 * store numbers, city codes, and reference digits that make each charge unique.
 * `COSTCO WHSE #0462 CARLSBAD CA` -> `costco whse`
 */
export function suggestPattern(description: string): string {
  const cleaned = description
    .toLowerCase()
    .replace(/[#*]+\S*/g, " ")       // store/reference numbers
    .replace(/\b\d[\d.\-/]*\b/g, " ") // bare digit runs
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean);
  // Two words is usually the brand without the branch; one if that's all there is.
  return words.slice(0, 2).join(" ") || cleaned.slice(0, 20);
}

export function categoryName(categories: Category[], id: string): string {
  return categories.find((c) => c.id === id)?.name ?? "Uncategorized";
}
