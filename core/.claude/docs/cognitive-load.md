# Cognitive Load — a vendored distillation

*A distilled, self-contained copy of Artem Zakirullin's ["Cognitive Load is What Matters"](https://minds.md/zakirullin/cognitive), vendored so the steward never fetches it at runtime. This is a faithful summary, not the full article — read the original to verify any claim. Re-audited against the source in the monthly loop (workflow/PLAN.md Step 7).*

## The one metric

**Cognitive load is how much a developer needs to think to complete a task.** It is the thing that actually matters — above "clean code," "readability," or any single rule. When you evaluate a PR, an issue, or your own comment, ask: how much does the reader have to hold in their head to follow it?

## Working memory is small

A person holds roughly **four chunks** in working memory at once. Past that, comprehension collapses — the reader stops reasoning and starts guessing. The article marks load inline: 🧠 fresh, 🧠++ a couple of facts held, 🤯 overload (more than ~4 facts at once).

**Consequence for the steward:** a PR that forces a reviewer past four simultaneous concerns is expensive to review no matter how good the code is. A comment that does the same has refuted its own point.

## Two kinds of load

- **Intrinsic** — the inherent difficulty of the task. Fundamental; cannot be removed.
- **Extraneous** — load from *how* things are presented, not from the task itself: incidental complexity, an author's quirks, needless indirection. This is the reducible part, and the whole target.

Reducing extraneous load is the job. You can't make a hard problem easy, but you can stop making an easy problem hard.

## Deep vs. shallow modules

- A **deep module** hides complex functionality behind a simple interface (Unix file I/O: five calls over hundreds of thousands of lines).
- A **shallow module** has a complex interface for the little it does. Many shallow modules are the trap: *"Not only do we have to keep in mind each module's responsibilities, but also all their interactions."*
- The author's anecdote: a 5K-line project with 7 deep classes was graspable again after 1.5 years away; a comparable one with 80 shallow classes was not.
- **"Important things should be big"** — so their importance is visible.

## Familiarity is not simplicity

*"Familiarity is not the same as simplicity."* They feel the same to the person who already holds the mental models — but a newcomer feels the true load. The more unique mental models a project demands, the longer anyone new takes to deliver value. A practical smell test: if newcomers stay confused for more than ~40 minutes at a stretch, the code needs work, not the newcomer.

**Consequence for the steward:** "the maintainers are used to it" is never evidence that something is simple. Symmetry and small stories protect the newcomer, and the maintainer on a bad day.

## Quotes worth keeping

- Rob Pike: *"A little copying is better than a little dependency."*
- Rob Pike: *"Reduce cognitive load by limiting the number of choices."*
- John Ousterhout: *"The best components are those that provide powerful functionality yet have a simple interface."*
- Brian Kernighan: *"Debugging is twice as hard as writing the code in the first place. Therefore, if you write the code as cleverly as possible, you are, by definition, not smart enough to debug it."*

*Source: https://minds.md/zakirullin/cognitive — distilled, not copied. The article cautions against turning any of this into dogma (e.g. hard line-count limits); these are lenses, not rules to enforce mechanically.*
