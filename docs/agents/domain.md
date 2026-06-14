# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repo root for the ReMind domain model, roles, security posture, and MVP build order.
- `docs/adr/` if architectural decisions are added later.

If any of these files don't exist, proceed silently. Don't flag their absence; don't suggest creating them upfront.

## File Structure

This is a single-context repo:

```text
/
├── CONTEXT.md
├── docs/adr/
└── docs/agents/
```

## Use The Glossary's Vocabulary

When output names a domain concept, use the terms from `CONTEXT.md`: student, expert, manager, organization, admin, system_manager, AI participant, subscription, credit wallet, appointment, chat room, forum, report, notification, file, log, and analytics summary.

## Flag ADR Conflicts

If an output contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.
