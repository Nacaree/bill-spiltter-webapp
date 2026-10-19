# Current Work

> Codex: Keep this file as a concise current snapshot under 50 lines. Replace
> outdated information, remove resolved items, and never append a historical log.

## Task

Phase 4: create the Sentry project and connect application monitoring.

## Completed

- User reports migrations, Vercel deployment and live bill flows are working.
- Existing private 10 MB uploads, extraction recovery and dual-currency QRs retained.
- Sentry project nathan-d2/bill-splitter-webapp created (team nathan, US region).
- SDK 11.8.0 initializes in browser, Node.js and Edge runtimes.
- Request hooks, error boundaries, server actions and handled failures instrumented.
- Action arguments/responses excluded; traces sample 100% dev, 10% production builds.
- Capability paths/private payloads filtered; unknown error messages are generic.
- Identity, headers, bodies, queries and provider/database payloads disabled.
- Replay/profiling absent; breadcrumbs/logs/metrics dropped. Platform logs separate.
- Public DSN configured; environment/release use Vercel environment/Git SHA.
- Replacement build token saved in ignored .env.sentry-build-plugin, never logged.
- Source-map uploads enabled; Vercel builds require SENTRY_AUTH_TOKEN.
- README and HANDOFF document setup, privacy choices and deployment requirements.

## Validation

- Real local errors and development traces confirmed in Sentry via MCP.
- Compiled production error maps to source with context; private canaries absent.
- Verification issue: https://nathan-d2.sentry.io/issues/BILL-SPLITTER-WEBAPP-3
- Browser source maps absent after upload; temporary verification routes removed.
- Final formatting, lint and webpack production build pass.
- No unit/database suite run for Sentry setup; previous baseline was 176 passing.

## Next Step

- No SQL migration for Sentry; setup is ready for Vercel deployment.
- Set SENTRY_AUTH_TOKEN in Vercel Preview and Production before deploying.
- Ensure the previously exposed old token is revoked; replacement is configured.
- Verify deployed Sentry reporting after Vercel builds the updated main branch.
- Alerts, rate limits, mobile/accessibility and privacy/support work remain.
