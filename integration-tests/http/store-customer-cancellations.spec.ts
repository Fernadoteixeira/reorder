import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import path from "path"
import {
  createCustomer,
  createCustomerAuthHeaders,
  createSubscriptionSeed,
} from "../helpers/cancellation-fixtures"
import {
  CancellationCaseStatus,
  CancellationReasonCategory,
} from "../../src/modules/cancellation/types"
import { SubscriptionStatus } from "../../src/modules/subscription/types"

medusaIntegrationTestRunner({
  medusaConfigFile: path.resolve(process.cwd(), "integration-tests"),
  env: {
    JWT_SECRET: "supersecret",
    COOKIE_SECRET: "supersecret",
  },
  testSuite: ({ api, getContainer }) => {
    describe("store customer cancellation endpoints", () => {
      it("starts a cancellation case from the customer storefront endpoint", async () => {
        const container = getContainer()
        const customer = await createCustomer(container)
        const { headers } = await createCustomerAuthHeaders(
          container,
          customer.id
        )

        const subscription = await createSubscriptionSeed(container, {
          customer_id: customer.id,
          reference: "SUB-STORE-CANCEL-1",
          status: SubscriptionStatus.ACTIVE,
        })

        const response = await api.post(
          `/store/customers/me/subscriptions/${subscription.id}/cancellation`,
          {
            reason: "Too expensive",
            reason_category: CancellationReasonCategory.PRICE,
            notes: "Found cheaper alternative",
          },
          { headers }
        )

        expect(response.status).toEqual(200)
        expect(response.data).toHaveProperty("cancellation_case")
        expect(response.data.cancellation_case.subscription_id).toEqual(
          subscription.id
        )
        expect(response.data.cancellation_case.status).toEqual(
          CancellationCaseStatus.REQUESTED
        )
        expect(response.data.cancellation_case.reason).toEqual("Too expensive")
        expect(response.data.cancellation_case.reason_category).toEqual(
          CancellationReasonCategory.PRICE
        )
      })

      it("returns 404 when trying to cancel another customer's subscription", async () => {
        const container = getContainer()
        const customerA = await createCustomer(container)
        const customerB = await createCustomer(container)
        const { headers: headersA } = await createCustomerAuthHeaders(
          container,
          customerA.id
        )

        const subscriptionB = await createSubscriptionSeed(container, {
          customer_id: customerB.id,
          reference: "SUB-STORE-CANCEL-OTHER",
          status: SubscriptionStatus.ACTIVE,
        })

        await expect(
          api.post(
            `/store/customers/me/subscriptions/${subscriptionB.id}/cancellation`,
            {
              reason: "Other reason",
            },
            { headers: headersA }
          )
        ).rejects.toMatchObject({
          response: {
            status: 404,
          },
        })
      })

      it("validates required cancellation reason", async () => {
        const container = getContainer()
        const customer = await createCustomer(container)
        const { headers } = await createCustomerAuthHeaders(
          container,
          customer.id
        )

        const subscription = await createSubscriptionSeed(container, {
          customer_id: customer.id,
          reference: "SUB-STORE-CANCEL-VALIDATE",
          status: SubscriptionStatus.ACTIVE,
        })

        await expect(
          api.post(
            `/store/customers/me/subscriptions/${subscription.id}/cancellation`,
            {
              reason: "", // Empty reason should fail validation
            },
            { headers }
          )
        ).rejects.toMatchObject({
          response: {
            status: 400,
          },
        })
      })
    })
  },
})

jest.setTimeout(60 * 1000)

