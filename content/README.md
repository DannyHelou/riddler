# content/

| Path | What |
|---|---|
| `riddles/*.json` | Six seed riddles in the §8.1–8.2 format (4 number, 1 word, plus 1 extra number). |
| `schedule.json` | Two sample days (`puzzle_date` in America/Toronto → riddle id per slot). |
| `sims/*.ts` | Monte Carlo verifiers for every `probability` riddle; `run-all.ts` is the reference for `scripts/verify.ts`. |
| `word-tests/*.json` | Labelled inputs for `scripts/tune-judge.ts`, including prompt-injection attempts. |

## Seed riddles

| id | Tier | Type | Answer | Trap | Cap |
|---|---|---|---|---|---|
| `keys-no-locks` | warm-up | word | piano (also keyboard, map…) | keychain, key ring, locksmith | n/a |
| `widget-machines` | warm-up | quantity | 5 minutes | 100 | 2 decades |
| `bayes-disease-test` | trap | percent | 9.02% | 99% | 50 pp |
| `birthday-23` | trap | percent | 50.73% | 6.3% | 50 pp |
| `rope-around-earth` | boss | quantity | 15.92 cm | 0.001 | 2 decades |
| `coin-two-heads` | boss | quantity | 6 flips | 4 | 0.5 decades |

All pass the §8.3 rule that the trap cannot itself score Genius ($c(\text{trap}) < 0.8$).

## Simulator interface

```ts
export const expected: number;                    // in answer_value units
export const kind: 'probability' | 'expectation';  // ±0.5 pp or ±1% relative
export function simulate(): number | null;         // one trial; null = discard (conditioning)
```

Verified output (10^6 kept trials each):

```
PASS bayes-disease-test: estimate 9.010, expected 9.02
PASS birthday-23: estimate 50.646, expected 50.73
PASS coin-two-heads: estimate 5.999, expected 6
```

Launch needs **30 riddles** (at least 5 word riddles) and a 10-day schedule; the rest are human-authored in this same format.
