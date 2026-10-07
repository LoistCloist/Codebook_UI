/**
 * Turns a scenario's `actions` outcome strings into a structured scene for the road diagram.
 * Pure (no server-only) so it can be unit-tested and rendered anywhere. Returns null for any
 * string it doesn't recognise, so the page simply shows no diagram instead of a wrong one.
 */

export type FigureType =
  "adult" | "child" | "elderly" | "disabled" | "pregnant" | "worker" | "cyclist" | "motorcyclist" | "person";

/** `label` is the singular noun from the text, e.g. "elderly pedestrian". */
export type Figure = { type: FigureType; count: number; label: string };

export type Group =
  { kind: "people"; figures: Figure[] } | { kind: "vehicle"; vehicle: "car" | "motorcycle"; occupants: number };

export type Scene = { ahead: Group; left: Group; passengers: number };

type Actions = { maintain: string; swerve_left: string; swerve_right: string };

const TYPE_BY_LABEL: Record<string, FigureType> = {
  "adult pedestrian": "adult",
  "child pedestrian": "child",
  "elderly pedestrian": "elderly",
  "disabled pedestrian": "disabled",
  "pregnant pedestrian": "pregnant",
  "road construction worker": "worker",
  cyclist: "cyclist",
  "teenage cyclist": "cyclist",
  motorcyclist: "motorcyclist",
};

function singular(noun: string): string {
  return noun.replace(/(\w+)s$/, "$1");
}

function parseGroup(text: string, suffix: string): Group | null {
  const m = new RegExp(`^kills (.+) ${suffix}$`).exec(text.trim());
  if (!m) return null;
  const parts = m[1].split(/, and |, | and /);
  const items: { count: number; noun: string }[] = [];
  for (const part of parts) {
    const pm = /^(\d+) (.+)$/.exec(part.trim());
    if (!pm) return null;
    const count = Number(pm[1]);
    if (count < 1) return null;
    items.push({ count, noun: pm[2] });
  }

  if (items.length === 1) {
    const { count, noun } = items[0];
    if (/^vehicle occupants?$/.test(noun)) return { kind: "vehicle", vehicle: "car", occupants: count };
    if (/^motorcycle riders?$/.test(noun)) return { kind: "vehicle", vehicle: "motorcycle", occupants: count };
  }

  const figures = items.map(({ count, noun }) => {
    const label = count > 1 ? singular(noun) : noun;
    return { type: TYPE_BY_LABEL[label] ?? "person", count, label };
  });
  return { kind: "people", figures };
}

export function parseScene(actions: Actions): Scene | null {
  const ahead = parseGroup(actions.maintain, "ahead");
  const left = parseGroup(actions.swerve_left, "on the left");
  const pm = /^kills (\d+) passengers? in the AV$/.exec(actions.swerve_right.trim());
  if (!ahead || !left || !pm || Number(pm[1]) < 1) return null;
  return { ahead, left, passengers: Number(pm[1]) };
}

/** Number of people in a group. */
export function groupSize(g: Group): number {
  return g.kind === "vehicle" ? g.occupants : g.figures.reduce((n, f) => n + f.count, 0);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Short text for one group, e.g. "1 adult pedestrian and 1 cyclist" or "a car with 3 occupants". */
export function describeGroup(g: Group): string {
  if (g.kind === "vehicle") {
    return g.vehicle === "car"
      ? `a car with ${plural(g.occupants, "occupant")}`
      : `a motorcycle with ${plural(g.occupants, "rider")}`;
  }
  const parts = g.figures.map((f) => plural(f.count, f.label));
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Accessible summary of the whole diagram. */
export function describeScene(s: Scene): string {
  return (
    `Top-down road diagram. Directly ahead of the AV: ${describeGroup(s.ahead)}. ` +
    `To the left: ${describeGroup(s.left)}. To the right: a rigid barrier. ` +
    `The AV carries ${plural(s.passengers, "passenger")}.`
  );
}
