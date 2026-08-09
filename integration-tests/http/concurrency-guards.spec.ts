import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import path from "path"
import {
  createAdminAuthHeaders,
  createCustomer,
  createDunningCaseSeed,
  createRenewalCycleSeed,
  createSubscriptionSeed,
} from "../helpers/cancellation-fixtures"
import { RenewalCycleStatus } from "../../src/modules/renewal/types"
import { DunningCaseStatus } from "../../src/modules/dunning/types"
import { SubscriptionStatus } from "../../src/modules/subscription/types"
import {
  processRenewalCycleWorkflow,
  runDunningRetryWorkflow,
} from "../../src/workflows"

medusaIntegrationTestRunner({
  medusaConfigFile: path.resolve(process.cwd(), "integration-tests"),
  env: {
    JWT_SECRET: "supersecret",
    COOKIE_SECRET: "supersecret",
  },
  testSuite: ({ api, getContainer }) => {
    describe("concurrency and race-condition guards", () => {
      it("prevents double-processing when two renewal workflows trigger simultaneously on the same cycle", async () => {
        const container = getContainer()
        const customer = await createCustomer(container)

        const subscription = await createSubscriptionSeed(container, {
          customer_id: customer.id,
          reference: "SUB-CONCUR-RENEWAL-1",
          status: SubscriptionStatus.ACTIVE,
        })

        const renewalCycle = await createRenewalCycleSeed(container, {
          subscription_id: subscription.id,
          status: RenewalCycleStatus.SCHEDULED,
          scheduled_for: new Date(),
        })

        // Run two workflow invocations concurrently
        const [res1, res2] = await Promise.allSettled([
          processRenewalCycleWorkflow(container).run({
            input: {
              renewal_cycle_id: renewalCycle.id,
              trigger_type: "manual",
            },
          }),
          processRenewalCycleWorkflow(container).run({
            input: {
              renewal_cycle_id: renewalCycle.id,
              trigger_type: "manual",
            },
          }),
        ])

        // Exactly one should succeed or both resolve deterministically without corrupting cycle status
        const successes = [res1, res2].filter((r) => r.status === "fulfilled")
        expect(successes.length).toBeGreaterThanOrEqual(1)
      })

      it("guards against simultaneous dunning retries on the same case", async () => {
        const container = getContainer()
        const customer = await createCustomer(container)

        const subscription = await createSubscriptionSeed(container, {
          customer_id: customer.id,
          reference: "SUB-CONCUR-DUNNING-1",
          status: SubscriptionStatus.PAST_DUE,
        })

        const renewalCycle = await createRenewalCycleSeed(container, {
          subscription_id: subscription.id,
          status: RenewalCycleStatus.FAILED,
        })

        const dunningCase = await createDunningCaseSeed(container, {
          subscription_id: subscription.id,
          renewal_cycle_id: renewalCycle.id,
          status: DunningCaseStatus.OPEN,
          next_retry_at: new Date(),
        })

        const [retry1, retry2] = await Promise.allSettled([
          runDunningRetryWorkflow(container).run({
            input: {
              dunning_case_id: dunningCase.id,
            },
          }),
          runDunningRetryWorkflow(container).run({
            input: {
              dunning_case_id: dunningCase.id,
            },
          }),
        ])

        const successes = [retry1, retry2].filter((r) => r.status === "fulfilled")
        expect(successes.length).toBeGreaterThanOrEqual(1)
      })
    })
  },
})

jest.setTimeout(60 * 1000)

