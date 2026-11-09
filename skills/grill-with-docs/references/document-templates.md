# Document Templates

Use only the sections for the selected artifacts. Adapt headings to an existing
project convention instead of forcing these fallback templates.

## Context Glossary

```markdown
# <Context Name>

<One or two sentences describing the bounded context.>

## Language

**<Canonical term>**: <One or two sentence definition.>
_Avoid_: <ambiguous alias>, <conflicting alias>

## Usage Rules

- <Project-specific rule for using these terms.>
```

Keep implementation details, requirements, plans, and session notes out of the
glossary. If Context Keeper owns the generated view, prepare a save handoff and
do not use this template to edit `CONTEXT.md` directly.

## Architecture Decision Record

```markdown
# ADR-<NNNN>: <Decision title>

**Date**: <YYYY-MM-DD>
**Status**: proposed
**Deciders**: <people or roles>

## Context

<Forces, constraints, and why a decision is required.>

## Decision

<The selected option in present tense.>

## Alternatives Considered

### <Alternative>

- Pros: <benefits>
- Cons: <costs>
- Rejected because: <specific rationale>

## Consequences

- Positive: <benefit>
- Negative: <trade-off>
- Risk and mitigation: <risk and response>

## Traceability

- Decision ledger: <D-NNN>
```

## Feature Specification

```markdown
# <Feature> Specification

**Status**: Draft
**Owner**: <owner or TBD>

## Objective
## Scope
## Non-Goals
## Actors and Scenarios
## Requirements
## Data, State, and Interfaces
## Failure and Boundary Behavior
## Acceptance Criteria
## Risks
## Open Questions
## Decision Traceability

| Decision | Requirement or criterion | Notes |
|---|---|---|
| D-001 | REQ-001 / AC-001 | <preserved rationale> |
```

Number requirements and acceptance criteria when the project has no established
scheme. Make each criterion observable and testable.

## Product Requirements Document

```markdown
# <Product or Feature>

**Status**: Draft

## Problem Statement
## Evidence
## Target Users and Job to Be Done
## Proposed Solution
## Key Hypothesis
## Scope and Non-Goals
## Success Metrics
## Prioritized Capabilities
## MVP
## User Flow
## Technical Feasibility and Risks
## Implementation Phases
## Open Questions
## Decision Traceability
```

For each success metric, include a target and measurement method. Mark missing
evidence as an assumption with a validation method.

## Implementation Plan

```markdown
# <Change> Implementation Plan

**Source**: <specification or PRD path>
**Status**: Draft

## Goal and Exit Criteria
## Repository Evidence
## Constraints and Invariants
## Dependency Graph
## Tasks

### Task 1: <Outcome>

- Decision links: D-001
- Depends on: none
- Paths: <verified paths>
- Action: <bounded implementation action>
- Pattern to mirror: <verified path and symbol>
- Tests first: <RED target and expected failure>
- Validate: <exact command or check>
- Exit criteria: <observable completion condition>

## Testing Strategy
## Security and Privacy
## Rollout and Rollback
## Documentation Updates
## Risks and Mitigations
## Open Questions
## Decision Traceability
```

Every task must be implementable without rediscovering basic repository facts.
If evidence is still missing, keep the plan in draft and identify the blocked
task explicitly.
