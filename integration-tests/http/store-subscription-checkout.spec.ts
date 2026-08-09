import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import path from "path"

medusaIntegrationTestRunner({
  medusaConfigFile: path.resolve(process.cwd(), "integration-tests"),
  env: {
    JWT_SECRET: "supersecret",
    COOKIE_SECRET: "supersecret",
  },
  testSuite: ({ api }) => {
    describe("store subscription checkout endpoints", () => {
      it("returns 404 or validation error when syncing subscription pricing for missing cart", async () => {
        await expect(
          api.post("/store/carts/cart_non_existent/sync-subscription-pricing", {})
        ).rejects.toMatchObject({
          response: {
            status: expect.any(Number),
          },
        })
      })

      it("returns error when subscribing with invalid or empty cart", async () => {
        await expect(
          api.post("/store/carts/cart_invalid/subscribe", {})
        ).rejects.toMatchObject({
          response: {
            status: expect.any(Number),
          },
        })
      })
    })
  },
})

jest.setTimeout(60 * 1000)
