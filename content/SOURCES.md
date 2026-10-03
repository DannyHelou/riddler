# Riddle sources

Riddler's riddles are classic puzzles. We take the **puzzle**, never the text: every prompt, hint and explanation is written for Riddler's format (brief §8: stated assumptions, one well-defined answer, a trap, an intuition of at most 4 sentences). Each riddle's `credit` field names where the idea came from.

| Source | License | Used for |
|---|---|---|
| [rudradesai200/BrainStellar](https://github.com/rudradesai200/BrainStellar) (`tex/book.tex`, 104 interview puzzles) | MIT, © 2023 Rudra Desai | 21 riddles credited "via BrainStellar (MIT)" (e.g. `monty-hall`, `drunk-passenger`, `two-eggs`, `pirate-gold`) |
| [crawsome/riddles](https://github.com/crawsome/riddles) (`riddles.csv`, 520 word riddles) | Unlicense (public domain) | 7 word riddles credited "via crawsome/riddles (Unlicense)" (e.g. `library-stories`, `thirteen-hearts`) |
| Recreational-math classics and folklore | Ideas are public domain | Everything else, credited "Classic", often with the puzzle's usual name (Buffon's needle, Pólya's urn, the potato paradox, Dudeney's spider and fly, Bachet's weights, the cognitive reflection test…) |

BrainStellar's collection appears to mirror puzzles from brainstellar.com, so its MIT grant may not cover the original wording. That is one more reason the text here is our own.

## How the bank was checked (2026-10-03)

- Every answer was computed independently: brute force, exhaustive search or exact arithmetic for counting and logic riddles; a Monte Carlo sim in `sims/` (10^6 trials) for every probability riddle.
- Every trap scores below Genius (`c(trap) < 0.8`), and most score between 0.2 and 0.7.
- Every word riddle has ≥ 20 labelled judge cases, including prompt-injection attempts.

## Adding more

1. Pick a puzzle with **one numeric answer** (or one clear word) and an answer a smart person would blurt out wrongly: that's the trap.
2. Write `riddles/<id>.json` (see `README.md`), keep `prompt_md` under about 170 characters so the question panel clears the balloon on a phone, and set `closeness_cap` so `c(trap) < 0.8`.
3. Probability riddles need `sims/<id>.ts`; word riddles need `word-tests/<id>.json` (≥ 20 cases, ≥ 2 injection attempts).
4. `npm run seed -- --check`, `npm run verify -- --only <id>`, `npm run tune-judge`.
5. `npm run schedule` to fold the new riddles into upcoming days (published days are never changed).
