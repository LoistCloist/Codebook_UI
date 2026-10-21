// Inter-rater reliability over nominal ratings. Pure: no Prisma, Next or env imports.
// A "unit" is one item being rated (a scenario); its value is the list of ratings it got
// (one per rater). Units with fewer than 2 ratings carry no agreement information and are ignored.

export type Units = Map<string, readonly string[]>;

export type ReliabilitySummary = {
  /** Krippendorff's alpha (nominal); NaN when undefined. */
  alpha: number;
  /** Fleiss' kappa, generalized to a varying number of raters per unit; NaN when undefined. */
  kappa: number;
  /** Mean pairwise agreement across units, 0–100; NaN when no unit has 2+ ratings. */
  percentAgreement: number;
  /** Units with 2+ ratings. */
  units: number;
  /** Ratings in those units. */
  ratings: number;
};

function counts(ratings: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of ratings) m.set(r, (m.get(r) ?? 0) + 1);
  return m;
}

function pairable(units: Units): Map<string, number>[] {
  return [...units.values()].filter((rs) => rs.length >= 2).map(counts);
}

/** Share of agreeing rater pairs within one unit (0–1). Requires 2+ ratings. */
function pairwise(c: Map<string, number>, n: number): number {
  let agree = 0;
  for (const k of c.values()) agree += k * (k - 1);
  return agree / (n * (n - 1));
}

/**
 * Krippendorff's alpha for nominal data, from the coincidence matrix:
 * α = 1 − (n − 1) · Σ_{c≠k} o_ck / Σ_{c≠k} n_c·n_k.
 * Handles missing ratings. NaN when fewer than 2 pairable values or no expected disagreement.
 */
export function krippendorffAlphaNominal(units: Units): number {
  const marginals = new Map<string, number>(); // n_c
  let observedDisagreement = 0; // Σ_{c≠k} o_ck
  for (const c of pairable(units)) {
    let m = 0;
    for (const k of c.values()) m += k;
    let agree = 0;
    for (const k of c.values()) agree += k * (k - 1);
    // Every value in the unit pairs with m − 1 others; pairs of unequal values are disagreements.
    observedDisagreement += (m * (m - 1) - agree) / (m - 1);
    for (const [cat, k] of c) marginals.set(cat, (marginals.get(cat) ?? 0) + k);
  }
  let n = 0;
  let sumSq = 0;
  for (const k of marginals.values()) {
    n += k;
    sumSq += k * k;
  }
  const expected = n * n - sumSq; // Σ_{c≠k} n_c·n_k
  if (n < 2 || expected === 0) return NaN;
  return 1 - ((n - 1) * observedDisagreement) / expected;
}

/**
 * Fleiss' kappa: κ = (P̄ − P_e) / (1 − P_e), where P̄ is the mean per-unit pairwise agreement
 * and P_e = Σ p_j² over the overall category shares. NaN when no units or P_e = 1.
 */
export function fleissKappa(units: Units): number {
  const cs = pairable(units);
  if (cs.length === 0) return NaN;
  const totals = new Map<string, number>();
  let all = 0;
  let pSum = 0;
  for (const c of cs) {
    let n = 0;
    for (const [cat, k] of c) {
      n += k;
      totals.set(cat, (totals.get(cat) ?? 0) + k);
    }
    all += n;
    pSum += pairwise(c, n);
  }
  const pBar = pSum / cs.length;
  let pe = 0;
  for (const k of totals.values()) pe += (k / all) ** 2;
  if (pe === 1) return NaN;
  return (pBar - pe) / (1 - pe);
}

/**
 * Agreement for a single unit. `pairwisePct` is 0–100 (NaN with fewer than 2 ratings).
 * `mode` is the most common rating (ties go to the value that sorts first); null when empty.
 */
export function unitAgreement(ratings: readonly string[]): {
  n: number;
  pairwisePct: number;
  mode: string | null;
  modeShare: number;
} {
  const n = ratings.length;
  const c = counts(ratings);
  let mode: string | null = null;
  let best = 0;
  for (const cat of [...c.keys()].sort()) {
    const k = c.get(cat)!;
    if (k > best) [mode, best] = [cat, k];
  }
  return {
    n,
    pairwisePct: n >= 2 ? pairwise(c, n) * 100 : NaN,
    mode,
    modeShare: n > 0 ? (best / n) * 100 : NaN,
  };
}

export function reliabilitySummary(units: Units): ReliabilitySummary {
  const cs = pairable(units);
  let ratings = 0;
  let pSum = 0;
  for (const c of cs) {
    let n = 0;
    for (const k of c.values()) n += k;
    ratings += n;
    pSum += pairwise(c, n);
  }
  return {
    alpha: krippendorffAlphaNominal(units),
    kappa: fleissKappa(units),
    percentAgreement: cs.length ? (pSum / cs.length) * 100 : NaN,
    units: cs.length,
    ratings,
  };
}
