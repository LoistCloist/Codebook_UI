// Owner: Agent 3. Pure (no Prisma, Next or env imports).
import { randomInt } from "node:crypto";

/**
 * Fisher–Yates shuffle returning a new array (§3.5). `rand(max)` must return an
 * integer in [0, max); defaults to crypto.randomInt.
 */
export function shuffle<T>(items: readonly T[], rand: (max: number) => number = randomInt): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Random question order for a newly served scenario (§3.6). */
export function randomQuestionOrder(rand: (max: number) => number = randomInt): "U_first" | "K_first" {
  return rand(2) === 0 ? "U_first" : "K_first";
}
