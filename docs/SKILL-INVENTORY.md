# Skill inventory summary

ECC contains 165 canonical skill directories in this revision. Count one entry
per `SKILL.md` under `skills/`. Reference files, aliases, and deployment copies
have separate roles and do not add to the canonical count.

## What changed

- Added the `grill-with-docs` and `temple-activity-recap` skills.
- Compared the `dev`, `review`, and `commit` workflows. Keep the canonical
  instructions under `skills/` and check deployed copies before replacing them.
- Record whether usage evidence exists separately from the last observed read.
  A missing record leaves usage unknown.

## How to repeat the inventory

Run `npm run catalog:check` to verify repository counts. Use the
`skill-stocktake` workflow to review skill entries, aliases, and read evidence.
