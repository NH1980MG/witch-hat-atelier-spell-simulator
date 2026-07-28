# RUN - Codex (independent spec review, witch-hat-atelier-spell-simulator)

You are **Codex**, the independent reviewer of a design specification in a
two-model (Claude Code + Codex) review. **This file is your complete,
self-contained instruction set - follow it exactly.** You need no other file and
no prior conversation.

**Nothing is implemented.** This is a review of two committed documents against
the real source they describe. There is no diff to read and no fix branch to
open. Your job is to decide whether the design is sound, correct about the
codebase, and complete enough to implement from.

**Run TASK A and TASK B below IN ORDER, in one session. Then STOP.**
The ordering is not cosmetic - see the anti-anchoring note.

---

## Anti-anchoring (read before anything else)

The spec under review already contains a "Verified Constraints" section and a
"Hazards" section listing what the Claude side found. If you read those first,
you will almost certainly ratify them. That failure mode is the specific reason
this review exists.

So: **TASK A forbids you from reading those two sections.** You derive the
constraint set yourself, from source. Only in TASK B do you read the spec whole
and report the delta both ways - what it claims that you could not confirm, and
what you found that it never mentions.

A review that returns "all claims confirmed, no gaps" is a failed review unless
TASK A independently produced the same list.

---

## STEP 0 - Anchor (do this first)

Run in the repo root:

```
git rev-parse --short HEAD && git branch --show-current && git status --porcelain
fm_path="$(pwd -P)"
git_top="$(cd "$(git rev-parse --show-toplevel)" && pwd -P)"
test "$fm_path" = "$git_top" || { echo "ABORT: not at git toplevel"; exit 1; }
gd="$(cd "$(git rev-parse --git-dir)" && pwd -P)"
gcd="$(cd "$(git rev-parse --git-common-dir)" && pwd -P)"
test "$gd" = "$gcd" || { echo "ABORT: linked worktree"; exit 1; }
test "$(basename "$git_top")" = "witch-hat-atelier-spell-simulator" || { echo "ABORT: repo mismatch"; exit 1; }
mkdir -p docs/audits/handoffs/from-codex
```

Capture the short SHA as `applies_to_commit`. Every `location` you cite is
`file:line` as of that SHA.

---

## Scope - already resolved

- repo_name: witch-hat-atelier-spell-simulator
- repo_path: /Users/didierh/projects/witch-hat-atelier-spell-simulator
- origin: https://github.com/NH1980MG/witch-hat-atelier-spell-simulator
- tracked files: 246
- primary_languages: browser JavaScript (no bundler, no package.json), HTML, CSS
- test_command: `node --test tests/*.test.mjs`
- test_runtime_status: **LIVE and verified** - run at commit b823ac6 on
  2026-07-27, 170 tests, 170 pass, 0 fail. Run it yourself before reporting any
  test-related finding.

**Warning about AGENTS.md.** The repo's `AGENTS.md` is stale in two ways that
will mislead you if you trust it: it states "The project relies on syntax checks
and deterministic validation scripts rather than a formal test runner" (there
are 170 tests under `tests/`, documented at `README.md:64`), and it states "No
Git history is available in this workspace" (there are 97 commits on `main`).
Treat source and `git` as authoritative over that file. Whether this staleness
is worth a finding is your call.

### Documents under review

- `docs/superpowers/specs/2026-07-27-element-search-placement-design.md`
- `docs/stress-tests/2026-07-27-element-search-placement.md`

Both committed at `b823ac6`.

### Source surfaces the design depends on

Verify claims against these; the line numbers are the Claude side's, and
confirming or correcting them is part of the job:

- `app.js` (9019 lines) - `state` init and `state.element` default near :421;
  `updateSelectionControls` :6593; `normalizeSelection` :6560;
  `deleteSelectedActions` :7412; `renderInkList` drawer click :7844 and Enter
  :7851; `onPointerDown` glyph branch :7584; `onPointerMove` :7591;
  `clearCanvas` :8762; the single global keydown handler :8898-8969
- `symbol-interactions.mjs` - `isSelectableAction` :102,
  `translateSelectedActions` :200, `scaleSelectedActions` :217
- `variant-catalog.mjs` - `normalizeSearchText` :60, `tokenScore` :94,
  `ENGLISH_ELEMENT_NAMES` export
- `spell-grammar.mjs` - `SIGIL_PROFILES` :12, `SIGN_PROFILES` :48
- `index.html`, `styles.css`, `i18n.mjs`
- `tests/` - especially `symbol-catalog.test.mjs` :155-156,
  `symbol-palette-ui.test.mjs` :21, `support-illustrations.test.mjs` :22,
  `i18n-html.test.mjs` :24, `i18n.test.mjs` :21

### Running the app

`python3 -m http.server 8000 --bind 127.0.0.1`, then
`http://127.0.0.1:8000/index.html`. Behavioural claims in the spec were made by
executing the app, not by reading it. You are encouraged to do the same rather
than reason statically - and to say so explicitly when you do not.

---

## Findings schema

- finding_id: `codex-spec-<NNN>`
- Fields, one `key: value` per line, no reformatting:
  - `finding_id`
  - `category` - one of: wrong-claim-about-source | missing-constraint |
    design-flaw | ambiguity | untestable-requirement | scope-error |
    over-engineering | doc-staleness
  - `severity` - P0 (would ship a bug or data loss) | P1 (would cost a rework
    cycle) | P2 (worth fixing, not blocking)
  - `location` - `file:line` in the spec, and the source `file:line` it
    concerns, as of your STEP-0 SHA
  - `verification_status` - `executed` (you ran something and read the output)
    or `static-reasoning` (you did not). Do not blur these.
  - `verification_command` - the command, or `none`
  - `evidence` - the observed output or the traced call path. Not an assertion.
  - `proposed_change` - one sentence
- Priority: wrong claims about source first, then missing constraints, then
  design flaws, then ambiguity, then leanness.

Write findings to `docs/audits/handoffs/from-codex/` (gitignored). Begin the
file with frontmatter carrying `handoff_id`, `repo_name`, `phase: spec-review`,
`pin: applies_to_commit=<your STEP-0 SHA>`, `status: complete`. Close it with
the END sentinel as the final line:

`<!-- END status: complete -->`

Write to a temp path and `mv` into place.

---

## TASK A - Independent constraint derivation (do NOT read the spec's
## "Verified Constraints" or "Hazards" sections)

You may read the spec's Objective, Scope, Interaction, Architecture, State,
Keyboard Map, Testing, Localisation, and Discoverability sections - you need to
know what is being built. Skip the two named sections entirely until TASK B.

Given a feature that: opens a modal search over the 64 palette elements with
`Cmd/Ctrl+K`; arms the pointer so canvas clicks stamp the chosen symbol
repeatedly; adds `Cmd/Ctrl+D` to duplicate the current selection; and routes
drawer clicks through the same arming path -

derive independently, from source and from running the app, the constraints and
failure modes such an implementation must respect in **this** codebase. Consider
at minimum: the existing global keydown handler and its fallthrough behaviour;
modal dialog focus and key propagation; what "armed" already means given the
existing tool model; what the selection model does and does not cover;
duplication and bounds; the i18n contract and what enforces it; the test suite's
existing assertions about `index.html`; and touch/pointer paths.

Produce your list before reading the spec's version. Record for each item
whether you established it by execution or by reasoning.

## TASK B - Review the spec against your list

Now read both documents in full, including the sections you skipped. Report:

1. **Claims the spec makes that you could not confirm, or that are wrong.**
   Include line-number drift.
2. **Constraints you found in TASK A that the spec does not mention.** These are
   the highest-value output of this review.
3. **Design flaws** - places where the design as written would not work, would
   fight the existing architecture, or solves the wrong problem.
4. **Ambiguities** - requirements that two competent implementers would read
   differently. Say which reading you would pick.
5. **Testability** - whether the stated tests would actually catch the failures
   they claim to, especially the Escape-during-overlay regression test.
6. **Over-engineering or scope error** - anything specified that should not be
   built, or scope that should be split.

Then answer these five questions directly:

- Is the decision to reuse `state.tool === "glyph"` instead of adding an armed
  flag correct, or does it break somewhere the spec did not consider?
- Is the `Escape` guard as described sufficient, or are there other paths to
  the destructive fallthrough?
- Does `Cmd/Ctrl+D` duplication have failure modes beyond the bounds-clamping
  one the spec names?
- Is the search-matching design (names plus rune, exact-then-prefix, no fuzzy)
  right for 64 elements, or will it frustrate users in a predictable way?
- Is this spec implementable as one unit of work, or should it be split?

---

## Verdict

Close with a verdict block: `approve` or `request-changes`, plus a one-line
justification and the count of findings by severity. Reply to the vault handoff
that pointed you here, following its Response Instructions.

Do not implement anything. Do not open branches or PRs. Do not modify tracked
source. You may write only under `docs/audits/handoffs/from-codex/`.
