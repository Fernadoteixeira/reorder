import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import path from "path"
import {
  createCustomer,
  createCustomerAuthHeaders,
  createPlanOfferSeed,
  createProductWithVariant,
  createSubscriptionSeed,
} from "../helpers/plan-offer-fixtures"
import { PlanOfferFrequencyInterval, PlanOfferScope } from "../../src/modules/plan-offer/types"
import {
  SubscriptionFrequencyInterval,
  SubscriptionStatus,
} from "../../src/modules/subscription/types"

medusaIntegrationTestRunner({
  medusaConfigFile: path.resolve(process.cwd(), "integration-tests"),
  env: {
    JWT_SECRET: "supersecret",
    COOKIE_SECRET: "supersecret",
  },
  testSuite: ({ api, getContainer }) => {
    describe("store customer subscriptions endpoints", () => {
      it("lists subscriptions only for the authenticated customer", async () => {
        const container = getContainer()
        const customer = await createCustomer(container)
        const { headers } = await createCustomerAuthHeaders(
          container,
          customer.id
        )

        // Seed 2 subscriptions for this customer
        await createSubscriptionSeed(container, {
          customer_id: customer.id,
          reference: "SUB-STORE-CUS1-1",
        })
        await createSubscriptionSeed(container, {
          customer_id: customer.id,
          reference: "SUB-STORE-CUS1-2",
        })

        // Seed 1 subscription for another customer
        const otherCustomer = await createCustomer(container)
        await createSubscriptionSeed(container, {
          customer_id: otherCustomer.id,
          reference: "SUB-STORE-CUS2-1",
        })

        const response = await api.get("/store/customers/me/subscriptions", {
          headers,
        })

        expect(response.status).toEqual(200)
        expect(response.data).toHaveProperty("subscriptions")
        expect(response.data).toHaveProperty("count")
        expect(response.data.count).toEqual(2)
        expect(
          response.data.subscriptions.every(
            (sub: { reference: string }) => sub.reference.startsWith("SUB-STORE-CUS1")
          )
        ).toBe(true)
      })

      it("returns subscription detail for customer's own subscription", async () => {
        const container = getContainer()
        const customer = await createCustomer(container)
        const { headers } = await createCustomerAuthHeaders(
          container,
          customer.id
        )

        const subscription = await createSubscriptionSeed(container, {
          customer_id: customer.id,
          reference: "SUB-STORE-DETAIL-1",
        })

        const response = await api.get(
          `/store/customers/me/subscriptions/${subscription.id}`,
          { headers }
        )

        expect(response.status).toEqual(200)
        expect(response.data.subscription).toBeDefined()
        expect(response.data.subscription.id).toEqual(subscription.id)
        expect(response.data.subscription.reference).toEqual("SUB-STORE-DETAIL-1")
      })

      it("returns 404 (IDOR guard) when accessing another customer's subscription", async () => {
        const container = getContainer()
        const customerA = await createCustomer(container)
        const customerB = await createCustomer(container)
        const { headers: headersA } = await createCustomerAuthHeaders(
          container,
          customerA.id
        )

        const subscriptionB = await createSubscriptionSeed(container, {
          customer_id: customerB.id,
          reference: "SUB-STORE-FOREIGN-1",
        })

        await expect(
          api.get(`/store/customers/me/subscriptions/${subscriptionB.id}`, {
            headers: headersA,
          })
        ).rejects.toMatchObject({
          response: {
            status: 404,
          },
        })
      })

      it("pauses and resumes a subscription from store customer endpoint", async () => {
        const container = getContainer()
        const customer = await createCustomer(container)
        const { headers } = await createCustomerAuthHeaders(
          container,
          customer.id
        )

        const subscription = await createSubscriptionSeed(container, {
          customer_id: customer.id,
          reference: "SUB-STORE-PAUSE-RESUME",
          status: SubscriptionStatus.ACTIVE,
        })

        const pauseResponse = await api.post(
          `/store/customers/me/subscriptions/${subscription.id}/pause`,
          { reason: "Customer requested pause" },
          { headers }
        )

        expect(pauseResponse.status).toEqual(200)
        expect(pauseResponse.data.subscription.status).toEqual("paused")

        const resumeResponse = await api.post(
          `/store/customers/me/subscriptions/${subscription.id}/resume`,
          { preserve_billing_anchor: true },
          { headers }
        )

        expect(resumeResponse.status).toEqual(200)
        expect(resumeResponse.data.subscription.status).toEqual("active")
      })

      it("skips next delivery cycle", async () => {
        const container = getContainer()
        const customer = await createCustomer(container)
        const { headers } = await createCustomerAuthHeaders(
          container,
          customer.id
        )

        const subscription = await createSubscriptionSeed(container, {
          customer_id: customer.id,
          reference: "SUB-STORE-SKIP",
          status: SubscriptionStatus.ACTIVE,
          skip_next_cycle: false,
        })

        const response = await api.post(
          `/store/customers/me/subscriptions/${subscription.id}/skip-next-delivery`,
          {},
          { headers }
        )

        expect(response.status).toEqual(200)
        expect(response.data.subscription.skip_next_cycle).toEqual(true)
      })

      it("updates shipping address", async () => {
        const container = getContainer()
        const customer = await createCustomer(container)
        const { headers } = await createCustomerAuthHeaders(
          container,
          customer.id
        )

        const subscription = await createSubscriptionSeed(container, {
          customer_id: customer.id,
          reference: "SUB-STORE-ADDR",
          status: SubscriptionStatus.ACTIVE,
        })

        const newAddress = {
          first_name: "Anna",
          last_name: "Nowak",
          address_1: "Dluga 15",
          city: "Krakow",
          postal_code: "31-147",
          country_code: "PL",
        }

        const response = await api.post(
          `/store/customers/me/subscriptions/${subscription.id}/change-address`,
          newAddress,
          { headers }
        )

        expect(response.status).toEqual(200)
        expect(response.data.subscription.shipping_address.city).toEqual("Krakow")
        expect(response.data.subscription.shipping_address.first_name).toEqual("Anna")
      })

      it("changes subscription frequency when offer allows it", async () => {
        const container = getContainer()
        const customer = await createCustomer(container)
        const { headers } = await createCustomerAuthHeaders(
          container,
          customer.id
        )

        const { product, variant } = await createProductWithVariant(container)

        await createPlanOfferSeed(container, {
          scope: PlanOfferScope.PRODUCT,
          product_id: product.id,
          is_enabled: true,
          allowed_frequencies: [
            {
              interval: PlanOfferFrequencyInterval.MONTH,
              value: 1,
            },
            {
              interval: PlanOfferFrequencyInterval.MONTH,
              value: 3,
            },
          ],
        })

        const subscription = await createSubscriptionSeed(container, {
          customer_id: customer.id,
          product_id: product.id,
          variant_id: variant.id,
          frequency_interval: SubscriptionFrequencyInterval.MONTH,
          frequency_value: 1,
          status: SubscriptionStatus.ACTIVE,
        })

        const response = await api.post(
          `/store/customers/me/subscriptions/${subscription.id}/change-frequency`,
          {
            frequency_interval: "month",
            frequency_value: 3,
          },
          { headers }
        )

        expect(response.status).toEqual(200)
        expect(response.data.subscription).toBeDefined()
      })
    })
  })
})
