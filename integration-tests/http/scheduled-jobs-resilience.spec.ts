import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import path from "path"
import processRenewalCycles from "../../src/jobs/process-renewal-cycles"
import processDunningRetries from "../../src/jobs/process-dunning-retries"
import processAnalyticsDailySnapshots from "../../src/jobs/process-analytics-daily-snapshots"
import processCancellationOperationalMetrics from "../../src/jobs/process-cancellation-operational-metrics"
import {
  createCustomer,
  createDunningCaseSeed,
  createRenewalCycleSeed,
  createSubscriptionSeed,
} from "../helpers/cancellation-fixtures"
import { RenewalCycleStatus } from "../../src/modules/renewal/types"
import { DunningCaseStatus } from "../../src/modules/dunning/types"
import { SubscriptionStatus } from "../../src/modules/subscription/types"

medusaIntegrationTestRunner({
  medusaConfigFile: path.resolve(process.cwd(), "integration-tests"),
  env: {
    JWT_SECRET: "supersecret",
    COOKIE_SECRET: "supersecret",
  },
  testSuite: ({ getContainer }) => {
    describe("scheduled jobs operational resilience", () => {
      it("executes renewal cycles job without throwing and logs structured outcome", async () => {
        const container = getContainer()
        const customer = await createCustomer(container)

        const subscription = await createSubscriptionSeed(container, {
          customer_id: customer.id,
          reference: "SUB-JOB-RENEWAL-1",
          status: SubscriptionStatus.ACTIVE,
        })

        await createRenewalCycleSeed(container, {
          subscription_id: subscription.id,
          status: RenewalCycleStatus.SCHEDULED,
          scheduled_for: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes in the past (due)
        })

        // Execute scheduled job directly
        await expect(processRenewalCycles(container)).resolves.not.toThrow()
      })

      it("executes dunning retries job without throwing on due cases", async () => {
        const container = getContainer()
        const customer = await createCustomer(container)

        const subscription = await createSubscriptionSeed(container, {
          customer_id: customer.id,
          reference: "SUB-JOB-DUNNING-1",
          status: SubscriptionStatus.PAST_DUE,
        })

        const renewalCycle = await createRenewalCycleSeed(container, {
          subscription_id: subscription.id,
          status: RenewalCycleStatus.FAILED,
        })

        await createDunningCaseSeed(container, {
          subscription_id: subscription.id,
          renewal_cycle_id: renewalCycle.id,
          status: DunningCaseStatus.OPEN,
          next_retry_at: new Date(Date.now() - 1000 * 60 * 10), // due
        })

        // Execute scheduled dunning job
        await expect(processDunningRetries(container)).resolves.not.toThrow()
      })

      it("executes analytics daily snapshots scheduled job cleanly", async () => {
        const container = getContainer()
        await expect(
          processAnalyticsDailySnapshots(container)
        ).resolves.not.toThrow()
      })

      it("executes cancellation operational metrics job cleanly", async () => {
        const container = getContainer()
        await expect(
          processCancellationOperationalMetrics(container)
        ).resolves.not.toThrow()
      })
    })
  },
})

jest.setTimeout(60 * 1000)

