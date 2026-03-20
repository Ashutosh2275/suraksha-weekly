# External Dependency Readiness Pack And Known-Gap Register (Phase 10)

## Readiness Pack

| Dependency | Owner | Status | Blocking Condition | Next Action |
|---|---|---|---|---|
| PostgreSQL production cluster | Infrastructure | Pending | DATABASE_URL and production network policy not finalized | Provision cluster and inject secret |
| Redis/queue broker | Infrastructure | Pending | REDIS_URL and retention policy pending | Create managed cache + queue policy |
| Payment sandbox credentials | Finance Integrations | Pending | Vendor onboarding incomplete | Complete account verification + webhook setup |
| Weather API key | Data Integrations | Pending | Production key + quota contract missing | Finalize API contract and set key rotation |
| AQI API key | Data Integrations | Pending | Production key + SLA missing | Finalize provider SLA and rotate credentials |
| Partner platform feed contract | Partnerships | Pending | No signed data-sharing agreement | Execute agreement and test feed quality |
| Legal/compliance policy language | Compliance | Pending | Regulatory wording not approved | Complete legal review and publish approved text |

## Known-Gap Register

| Gap ID | Gap | Impact | Mitigation | Owner |
|---|---|---|---|---|
| GAP-01 | External DB not wired in runtime | Cannot run production-grade persistence | Complete DATABASE_URL wiring and migration pipeline | Infrastructure |
| GAP-02 | Queue broker externalization pending | In-memory queue not suitable for production durability | Integrate managed queue and retry policies | Platform Engineering |
| GAP-03 | Payment callbacks not validated against real vendor | Payout state transitions not fully production-like | Wire payment sandbox callback signatures | Finance Integrations |
| GAP-04 | Third-party weather/AQI keys absent | Live trigger fidelity constrained to mocks | Enable key-based adapters and fallback governance | Data Integrations |
| GAP-05 | Legal sign-off pending | Release cannot be promoted to regulated environment | Finalize compliance review and signoff workflow | Compliance |

## Readiness Validation Commands

- npm run build
- npm run test
- npm run test:phase9
- GET /api/v1/admin/governance/external-readiness
- GET /api/v1/admin/governance/release-readiness
