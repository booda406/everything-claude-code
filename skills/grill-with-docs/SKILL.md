---
name: grill-with-docs
description: Stress-test a plan or design through a codebase-grounded interview, resolve terminology and decisions, and produce traceable project documents such as a feature specification, PRD, implementation plan, acceptance criteria, context glossary, or ADR. Use when a change is still ambiguous, the user asks to be grilled or challenged, or the user wants durable planning documents before implementation.
---

# Grill With Docs

Turn an ambiguous plan into shared understanding and then into the exact durable
documents the user needs. Keep the interview, decision capture, and document
generation in one session so precise answers are not weakened during handoff.

## Start the session

1. Identify the plan, design, or repository under discussion.
2. Inspect repository instructions and existing documentation before asking
   questions. Search for `AGENTS.md`, `CLAUDE.md`, `CONTEXT-MAP.md`,
   `CONTEXT.md`, ADRs, PRDs, specifications, plans, and issue templates.
3. Determine the document profile. If the user already named deliverables, use
   them. Otherwise recommend one profile and ask for confirmation:

   - `clarify-only`: interview plus eligible glossary and ADR updates
   - `specification`: feature specification with acceptance criteria
   - `prd`: product requirements document with evidence and success metrics
   - `implementation-plan`: codebase-grounded executable plan
   - `full-handoff`: specification or PRD plus implementation plan

4. Read [document contracts](references/document-contracts.md) after selecting
   a profile. Read [document templates](references/document-templates.md) only
   for the artifact types that will be produced.
5. State the proposed deliverables and paths. Follow an existing project
   convention before using a fallback path.

Do not silently expand the requested deliverables. Treat an existing file,
conflicting convention, or ambiguous destination as a decision for the user.

## Separate facts from decisions

Find facts with the agent; reserve decisions for the user.

- Inspect the codebase, configuration, tests, history, and authoritative
  documentation instead of asking the user to rediscover facts.
- Dispatch independent, read-only exploration to subagents in parallel when
  available. Keep questions downstream of unresolved research off the current
  frontier.
- Ask the user only for priorities, trade-offs, policy choices, intended
  behavior, and other judgments that cannot be discovered.
- Cite repository paths or external sources when a finding materially shapes a
  question or document.

## Grill the design tree

Map the plan as a design tree. A parent decision must resolve before asking a
question that depends on it.

Work in short rounds of no more than three independent frontier questions. For
each question:

```text
Q1 - <decision title>: <focused question and concrete options>

Recommended: <answer and concise rationale>
```

After each response:

1. Recompute the frontier.
2. Challenge vague or overloaded terms.
3. Test the answer with a concrete happy path, edge case, failure, or boundary.
4. Compare stated behavior with the code and existing documents.
5. Record the resolution in the decision ledger.

Do not dump the entire questionnaire at once. Do not ask a question whose
prerequisite is still unresolved.

## Maintain the decision ledger

Keep a session-local decision ledger as the lossless source for final document
generation. Assign stable IDs in resolution order:

```text
D-001 | resolved | decision | rationale | affected requirements
Q-001 | deferred | open question | owner or unblock condition
T-001 | resolved | canonical term | definition | avoided aliases
```

Capture numeric defaults, ordering guarantees, negative requirements, boundary
conditions, rejected alternatives, and explicit non-goals verbatim enough to
preserve their meaning. Map every resolved `D-NNN` entry into at least one final
document section. Keep deferred `Q-NNN` entries visible; never convert them into
assumptions silently.

## Update domain and architecture records

Treat `CONTEXT.md` as a glossary, not as a specification, scratchpad, or
implementation plan. Add only canonical project terms, short definitions, and
aliases to avoid.

Before editing context, detect its ownership:

- If `CONTEXT.md` is a normal repository document, or a `CONTEXT-MAP.md` points
  to one, update a resolved term inline when it crystallizes.
- If a generated marker, `context.json`, or Context Keeper (`ck`) owns the file,
  do not directly edit `CONTEXT.md` or `context.json`. Use the repository's
  `/ck:save` workflow: prepare the exact `summary`, `leftOff`, `nextSteps`,
  `decisions`, and `blockers` fields, show the save draft, wait for confirmation,
  and then invoke Context Keeper. Keep `decisions` as `{what, why}` objects.
- If no context document exists, obtain explicit user authorization before
  creating `CONTEXT.md`. Ask only after the first term is resolved and only when
  the selected profile includes domain documentation. If authorization is
  declined, retain the `T-NNN` entries in the ledger and agreed final documents.

Offer an ADR only when all three gates pass:

1. **Hard to reverse** — changing it later has meaningful cost.
2. **Surprising without context** — a future maintainer would reasonably ask
   why this choice was made.
3. **Real trade-off** — credible alternatives existed and were rejected for a
   reason.

Draft the ADR using the repository's existing convention. Obtain explicit
approval before creating a new ADR or ADR directory.

## Confirm shared understanding

When the frontier is empty, present a compact convergence summary:

- objective and users
- scope and non-goals
- resolved decisions by `D-NNN`
- acceptance behavior and failure cases
- deferred questions by `Q-NNN`
- proposed files to create or update

Ask the user to confirm shared understanding. Do not write final documents
before that confirmation. Inline glossary updates already approved during the
session may remain; ADRs retain their separate approval gate.

If confirmation changes an answer, reopen the affected branch, update the
ledger, and reconfirm.

## Generate the agreed documents

After confirmation:

1. Re-read the selected sections of
   [document contracts](references/document-contracts.md).
2. Generate only the agreed artifacts using the relevant sections of
   [document templates](references/document-templates.md).
3. Preserve the project's established format and path when one exists.
4. Include a decision traceability section mapping every `D-NNN` entry to the
   requirement, acceptance criterion, plan step, or ADR that carries it.
5. Mark unresolved items as open; do not fill gaps with invented certainty.
6. Preview material changes and do not overwrite an existing document without
   explicit user authorization.
7. Re-read every generated artifact against the ledger before reporting
   completion.

## Close the session

Report:

- files created or updated
- selected document profile
- resolved and deferred decision counts
- ADRs created or declined
- validation performed
- recommended next workflow, such as TDD implementation or plan review

Stop after document generation unless the user also authorized implementation.
