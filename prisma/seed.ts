// Seeds ~20 fake participants so the admin dashboard and exports can be checked.
//
// Run with `npm run db:seed` (prisma.config.ts → `tsx --conditions=react-server prisma/seed.ts`).
// The react-server condition is needed because the modules below start with `import "server-only"`.
//
// Idempotent and safe on a shared dev DB: it only ever deletes/creates rows whose
// participant_hash is participantHash("seed-sub-1" … "seed-sub-20"); responses cascade.
import "dotenv/config";
import { COMPREHENSION_CORRECT } from "@/config/comprehension-answers";
import { study } from "@/config/study";
import { participantHash } from "@/lib/auth/hash";
import { db, type Prisma } from "@/lib/db";
import type { Choice } from "@/lib/schemas";
import { getScenarios } from "@/lib/scenarios";

const SEED_COUNT = 20;
const CHOICES: readonly Choice[] = ["maintain", "swerve_left", "swerve_right"];
const AGES = ["age_18_24", "age_25_34", "age_35_44", "age_45_54", "age_55_64", "age_65_plus", "prefer_not_to_say"] as const;
const COUNTRIES = ["GB", "US", "DE", "MM", "IN", "BR", "prefer_not_to_say"] as const;
const DRIVES = ["yes", "no", "prefer_not_to_say"] as const;
const ETHICS = ["none", "some", "substantial", "prefer_not_to_say"] as const;

type Pair = { u: Choice; k: Choice };
type Role =
  | { kind: "completed"; answers: Pair[]; comprehensionPassed: boolean }
  | { kind: "mid_scenarios"; answers: Pair[]; answeredCount: number } // next one served, unanswered
  | { kind: "before_primer" }; // demographics done, primer/comprehension not yet

/**
 * Distinct, non-straight-line answer sets (indexed by sorted scenario id). Set i encodes i in
 * base 9 (one digit = one (U, K) pair per scenario), so different i give different sets.
 */
function uniqueAnswerSets(scenarioCount: number, wanted: number): Pair[][] {
  const pairs: Pair[] = CHOICES.flatMap((u) => CHOICES.map((k) => ({ u, k })));
  const total = 9 ** Math.min(scenarioCount, 8);
  const sets: Pair[][] = [];
  // Stride through the space so neighbouring participants look less alike.
  for (let step = 0; step < total && sets.length < wanted; step++) {
    let code = (step * 7919 + 3) % total;
    const set = Array.from({ length: scenarioCount }, () => {
      const p = pairs[code % 9];
      code = Math.floor(code / 9);
      return p;
    });
    if (new Set(set.flatMap((p) => [p.u, p.k])).size > 1) sets.push(set);
  }
  return sets;
}

function buildRoles(ids: string[]): Role[] {
  const needed = SEED_COUNT - 2; // everything except the in-progress pair uses a distinct set
  const pool = uniqueAnswerSets(ids.length, needed);
  if (pool.length < needed) {
    console.warn(
      `Only ${pool.length} distinct non-straight answer sets exist for ${ids.length} scenario(s); ` +
        "some seed participants will share answer strings by chance.",
    );
  }
  let next = 0;
  const take = () => pool[next++ % pool.length];
  const straight: Pair[] = ids.map(() => ({ u: "maintain", k: "maintain" }));

  const dup = take();
  const roles: Role[] = [
    { kind: "completed", answers: dup, comprehensionPassed: true }, // 1: duplicate pair
    { kind: "completed", answers: dup, comprehensionPassed: true }, // 2: duplicate pair
    { kind: "completed", answers: straight, comprehensionPassed: true }, // 3: straight-liner
    { kind: "completed", answers: take(), comprehensionPassed: false }, // 4: comprehension failure
    { kind: "mid_scenarios", answers: take(), answeredCount: Math.max(0, ids.length - 1) }, // 5: in progress
    { kind: "before_primer" }, // 6: in progress
  ];
  while (roles.length < SEED_COUNT) roles.push({ kind: "completed", answers: take(), comprehensionPassed: true });
  return roles;
}

const rotate = <T>(xs: T[], n: number) => xs.map((_, i) => xs[(i + n) % xs.length]);
const addSec = (d: Date, s: number) => new Date(d.getTime() + s * 1000);

function buildParticipant(n: number, role: Role, ids: string[], now: Date): Prisma.ParticipantCreateInput {
  const order = rotate(ids, n);
  const startedAt = addSec(now, -(SEED_COUNT - n + 1) * 3600 - n * 97);
  const demographicsAt = addSec(startedAt, 60 + n);
  const base = {
    participantHash: participantHash(`seed-sub-${n}`),
    consentedAt: startedAt,
    startedAt,
    ageRange: AGES[n % AGES.length],
    country: COUNTRIES[n % COUNTRIES.length],
    drives: DRIVES[n % DRIVES.length],
    ethicsCoursework: ETHICS[n % ETHICS.length],
    demographicsAt,
    scenarioOrder: order,
  };
  if (role.kind === "before_primer") return base;

  const passed = role.kind === "completed" ? role.comprehensionPassed : true;
  const correct = [...COMPREHENSION_CORRECT];
  const wrong = study.comprehension.map((q, i) => q.options.find((o) => o.value !== COMPREHENSION_CORRECT[i])!.value);
  const primerCompletedAt = addSec(demographicsAt, 120 + n * 3);

  // Answers are given in display order; role.answers is indexed by sorted scenario id.
  const sortedIds = [...ids].sort();
  const answerFor = (id: string) => role.answers[sortedIds.indexOf(id)];
  const answeredCount = role.kind === "mid_scenarios" ? role.answeredCount : ids.length;

  const responses: Prisma.ResponseCreateWithoutParticipantInput[] = [];
  let t = primerCompletedAt;
  order.forEach((scenarioId, position) => {
    const a = position < answeredCount ? answerFor(scenarioId) : undefined;
    const isNextServed = !a && position === answeredCount && role.kind === "mid_scenarios";
    if (!a && !isNextServed) return;
    const servedAt = addSec(t, 2);
    const answeredAt = a ? addSec(servedAt, 25 + ((n * 7 + position * 13) % 60)) : null;
    responses.push({
      scenarioId,
      position,
      questionOrder: (n + position) % 2 === 0 ? "U_first" : "K_first",
      utilitarianChoice: a?.u ?? null,
      kantianChoice: a?.k ?? null,
      ownChoice: a && study.askOwnChoice ? CHOICES[(n + position) % 3] : null,
      confidence: a && study.askConfidence ? 1 + ((n + position) % 5) : null,
      firstServedAt: servedAt,
      servedAt,
      answeredAt,
    });
    if (answeredAt) t = answeredAt;
  });

  return {
    ...base,
    comprehensionAnswers: passed ? correct : wrong,
    comprehensionPassed: passed,
    primerCompletedAt,
    completedAt: role.kind === "completed" ? t : null,
    responses: { create: responses },
  };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed fake participants with NODE_ENV=production.");
  }
  const ids = getScenarios().map((s) => s.id);
  const roles = buildRoles(ids);
  const now = new Date();
  const data = roles.map((role, i) => buildParticipant(i + 1, role, ids, now));
  const hashes = data.map((d) => d.participantHash);

  await db.$transaction(async (tx) => {
    const removed = await tx.participant.deleteMany({ where: { participantHash: { in: hashes } } });
    for (const d of data) await tx.participant.create({ data: d });
    console.log(`Seed: removed ${removed.count} previous seed participant(s), created ${data.length}.`);
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
