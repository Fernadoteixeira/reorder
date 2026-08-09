# Spec: 360-Degree End-to-End Coverage, Performance & Architectural Hardening

## TLDR & Overview

The `Reorder` plugin currently implements 7 core domain modules (`Subscriptions`, `Plans & Offers`, `Renewals`, `Dunning`, `Cancellation & Retention`, `Activity Log`, and `Analytics`) as well as Storefront API endpoints for subscription checkout, customer portal actions, and PDP offer resolution.

While unit and individual admin route integration tests exist, there are notable coverage and architectural gaps in:
1. **Storefront End-to-End Integration Testing**: No automated integration tests currently validate customer-facing `/store/customers/me/subscriptions/*`, `/store/products/:id/subscription-offer`, or `/store/carts/:id/subscribe` routes.
2. **Concurrency & Race-Condition Guards**: Concurrent mutations (e.g. renewal cycle charging vs. customer cancellation / plan change) require explicit isolation and lock verification.
3. **Scheduled Job Automation & Reliability**: Background jobs (`src/jobs/`) need dedicated operational testing for edge conditions (lock timeouts, batch limits, failure recovery).
4. **Performance & Query Optimization**: Database indexing and N+1 query elimination across link resolvers and snapshot analytics.

This specification outlines a phased, systematic engineering execution to bring the entire codebase to 360-degree E2E test coverage with peak performance and high reliability.

---

## Proposed Architecture & Coverage Structure

### 1. Storefront HTTP Integration Test Suite
Location: `integration-tests/http/`
- `store-subscription-routes.spec.ts`: Validates customer authentication, subscription retrieval, pause, resume, change-address, change-frequency, skip-next-delivery, and swap-product.
- `store-subscription-checkout.spec.ts`: Validates pricing normalization (`sync-subscription-pricing`), discount calculation, cart completion, order-to-subscription linkage, and mixed-cart validation.
- `store-product-offers.spec.ts`: Validates PDP offer resolution, variant overrides, frequency tiers, and discount rules.
- `store-customer-cancellations.spec.ts`: Validates customer-initiated cancellation, retention offer recommendations, acceptance of retention offers, and final churn recording.

### 2. Scheduled Jobs & Concurrency Integration Suite
Location: `integration-tests/http/`
- `scheduled-jobs-resilience.spec.ts`: Validates scheduled execution of `process-renewal-cycles`, `process-dunning-retries`, `process-analytics-daily-snapshots`, and `process-cancellation-operational-metrics`.
- `concurrency-guards.spec.ts`: Validates optimistic/pessimistic lock semantics when simultaneous mutations occur.

### 3. Performance & Read Model Hardening
- Audit database composite indexes across domain tables (`subscription`, `renewal_cycle`, `dunning_case`, `cancellation_case`, `subscription_log`, `subscription_metrics_daily`).
- Validate query execution plans and ensure zero N+1 entity resolutions across Medusa links.

---

## Step-by-Step Implementation Plan

### Phase 1: Storefront E2E Integration Coverage
- [ ] Implement `integration-tests/http/store-subscriptions-routes.spec.ts`
- [ ] Implement `integration-tests/http/store-subscription-checkout.spec.ts`
- [ ] Implement `integration-tests/http/store-product-offers.spec.ts`
- [ ] Implement `integration-tests/http/store-customer-cancellations.spec.ts`

### Phase 2: Orchestration, Scheduled Jobs & Concurrency Testing
- [ ] Implement `integration-tests/http/scheduled-jobs-resilience.spec.ts`
- [ ] Implement `integration-tests/http/concurrency-guards.spec.ts`

### Phase 3: Performance, Anti-N+1 & Read Model Verification
- [ ] Audit module database models and Medusa entity link resolvers
- [ ] Ensure pagination, filtering, and snapshot indexing are optimal

### Phase 4: Full Validation & Lessons Learned
- [ ] Run full test suite (`yarn test:integration:http` and `yarn test:integration:modules`)
- [ ] Update runtime documentation in `docs/` if any behavior or contract is adjusted
- [ ] Record any architectural findings in `.agents/lessons.md`

---

## Verification & Testing
All phases are strictly verified through Medusa v2 integration tests using Jest and `@medusajs/test-utils`.
Commands:
```bash
yarn build
yarn test:integration:http
```
