import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import path from "path"
import {
  createPlanOfferSeed,
  createProductWithVariant,
} from "../helpers/plan-offer-fixtures"
import {
  PlanOfferDiscountType,
  PlanOfferFrequencyInterval,
  PlanOfferScope,
} from "../../src/modules/plan-offer/types"

medusaIntegrationTestRunner({
  medusaConfigFile: path.resolve(process.cwd(), "integration-tests"),
  env: {
    JWT_SECRET: "supersecret",
    COOKIE_SECRET: "supersecret",
  },
  testSuite: ({ api, getContainer }) => {
    describe("store product subscription offer endpoints", () => {
      it("returns active subscription offer for product with allowed frequencies and discounts", async () => {
        const container = getContainer()
        const { product, variant } = await createProductWithVariant(container)

        await createPlanOfferSeed(container, {
          name: "Standard Monthly Plan",
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
          discount_per_frequency: [
            {
              interval: PlanOfferFrequencyInterval.MONTH,
              value: 1,
              discount_type: PlanOfferDiscountType.PERCENTAGE,
              discount_value: 10,
            },
            {
              interval: PlanOfferFrequencyInterval.MONTH,
              value: 3,
              discount_type: PlanOfferDiscountType.PERCENTAGE,
              discount_value: 15,
            },
          ],
        })

        const response = await api.get(
          `/store/products/${product.id}/subscription-offer`
        )

        expect(response.status).toEqual(200)
        expect(response.data).toHaveProperty("is_subscription_available", true)
        expect(response.data).toHaveProperty("product_id", product.id)
        expect(response.data.allowed_frequencies).toHaveLength(2)
        expect(response.data.discount_per_frequency).toHaveLength(2)
      })

      it("returns variant-level override when querying with variant_id", async () => {
        const container = getContainer()
        const { product, variant } = await createProductWithVariant(container)

        // Product level offer (10% off)
        await createPlanOfferSeed(container, {
          name: "Product Offer",
          scope: PlanOfferScope.PRODUCT,
          product_id: product.id,
          is_enabled: true,
          allowed_frequencies: [
            {
              interval: PlanOfferFrequencyInterval.MONTH,
              value: 1,
            },
          ],
          discount_per_frequency: [
            {
              interval: PlanOfferFrequencyInterval.MONTH,
              value: 1,
              discount_type: PlanOfferDiscountType.PERCENTAGE,
              discount_value: 10,
            },
          ],
        })

        // Variant level offer override (25% off)
        await createPlanOfferSeed(container, {
          name: "Variant Override Offer",
          scope: PlanOfferScope.VARIANT,
          product_id: product.id,
          variant_id: variant.id,
          is_enabled: true,
          allowed_frequencies: [
            {
              interval: PlanOfferFrequencyInterval.MONTH,
              value: 1,
            },
          ],
          discount_per_frequency: [
            {
              interval: PlanOfferFrequencyInterval.MONTH,
              value: 1,
              discount_type: PlanOfferDiscountType.PERCENTAGE,
              discount_value: 25,
            },
          ],
        })

        const response = await api.get(
          `/store/products/${product.id}/subscription-offer?variant_id=${variant.id}`
        )

        expect(response.status).toEqual(200)
        expect(response.data.is_subscription_available).toBe(true)
        expect(response.data.discount_per_frequency[0].discount_value).toEqual(25)
      })

      it("returns is_subscription_available false when no enabled plan offers exist", async () => {
        const container = getContainer()
        const { product } = await createProductWithVariant(container)

        const response = await api.get(
          `/store/products/${product.id}/subscription-offer`
        )

        expect(response.status).toEqual(200)
        expect(response.data.is_subscription_available).toBe(false)
      })

      it("returns 404 when product does not exist", async () => {
        await expect(
          api.get("/store/products/prod_non_existent/subscription-offer")
        ).rejects.toMatchObject({
          response: {
            status: 404,
          },
        })
      })
    })
  })
})
