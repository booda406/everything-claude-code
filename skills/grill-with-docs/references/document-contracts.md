# Document Contracts

Use these contracts after selecting a document profile. Prefer the repository's
existing project convention over every fallback below.

## Path resolution

Resolve each destination in this order:

1. Use the explicit path supplied by the user.
2. Use the existing project convention for the same artifact type.
3. Use an existing `.claude/PRPs/` workflow:
   - PRD: `.claude/PRPs/prds/<slug>.prd.md`
   - plan: `.claude/PRPs/plans/<slug>.plan.md`
4. Otherwise use:
   - specification: `docs/specs/<slug>.md`
   - PRD: `docs/prd/<slug>.md`
   - implementation plan: `docs/plans/<slug>.md`
   - ADR: `docs/adr/<number>-<slug>.md`

Use the repository's language, naming, numbering, and index conventions. Do not overwrite
an existing file, initialize a new documentation system, or create a parallel
source of truth without explicit authorization.

## Profile contracts

### `clarify-only`

Produce no final specification by default. Update only an eligible plain
`CONTEXT.md`, an approved ADR, or the Context Keeper handoff described by the
repository. Finish with the convergence summary and decision ledger counts.

### `specification`

Produce one feature specification containing:

- objective, scope, and non-goals
- actors and representative scenarios
- functional and non-functional requirements
- state, data, API, or UI behavior when relevant
- failure handling and boundary cases
- measurable acceptance criteria
- open questions, risks, and decision traceability

Phrase each acceptance criterion as observable behavior. Include at least one
negative or failure criterion for every material error path.

### `prd`

Produce one PRD containing:

- problem statement and supporting evidence
- target users, current behavior, and desired outcome
- proposed solution, alternatives, scope, and non-goals
- key hypothesis and measurable success metrics
- prioritized capabilities and MVP definition
- user flow, risks, rollout considerations, and open questions
- implementation phases and decision traceability

Label unsupported evidence as an assumption and state how to validate it.

### `implementation-plan`

Produce one codebase-grounded plan containing:

- source specification or PRD
- relevant repository files and patterns
- ordered tasks with dependencies and safe parallelism
- per-task action, affected paths, implementation detail, and validation
- testing strategy, rollout, rollback, security, and documentation updates
- exit criteria and decision traceability

Make the plan executable by a developer unfamiliar with the codebase. Never
invent a file path or code pattern; cite what was inspected.

### `full-handoff`

Produce a specification or PRD first, then an implementation plan referencing
it. Embed acceptance criteria in the source requirements document instead of
creating a redundant standalone file unless the project already uses one.

## Decision ledger contract

Treat the decision ledger as the traceability spine:

- Map every resolved `D-NNN` to one or more document sections.
- Carry exact numeric values, ordering rules, permissions, and non-goals.
- Map every deferred `Q-NNN` to an Open Questions section with an owner or
  unblock condition when known.
- Keep canonical terms consistent with the approved glossary.
- Record contradictions instead of choosing one source silently.

Before writing, compare the draft against the ledger. After writing, compare the
saved file against it again.

## Write and overwrite contract

Invocation authorizes creation of the deliverables the user explicitly
requested, but not replacement of existing files or creation of unrequested
artifacts. Require confirmation when:

- shared understanding has not yet been confirmed
- the destination already exists
- the repository contains conflicting document conventions
- an ADR or new ADR directory would be created
- the selected output would duplicate an authoritative document

Use atomic, scoped edits. Preserve unrelated content and user changes.
