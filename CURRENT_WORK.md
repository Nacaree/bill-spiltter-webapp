# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Complete and verify Phase 1: create, access, share, and join a bill.

## Completed

- Added the Phase 1 schema, access tokens, signed cookies, server actions, and
  bill pages.
- Added unit and browser tests.
- Confirmed 13 unit tests, lint, formatting, build, and safe browser tests pass.

## In Progress

- Waiting to connect Supabase and run the database-backed browser tests.

## Known Problems

- Supabase is not connected, so the migration and complete create-to-join flow
  have not been tested against a real database.

## Next Step

Connect Supabase, apply the Phase 1 migration, then run
`npm run test:e2e:supabase`.
