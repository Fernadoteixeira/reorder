import { defineConfig, loadEnv } from "@medusajs/framework/utils"
import path from "path"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9005"
const publicPort = Number(process.env.MEDUSA_PUBLIC_PORT || 9005)

module.exports = defineConfig({
  projectConfig: {
    databaseUrl:
      process.env.DATABASE_URL ||
      "postgres://postgres:postgres@localhost:5432/medusa-reorder?sslmode=disable",
    databaseDriverOptions: {
      ssl: false,
    },
    redisUrl: process.env.REDIS_URL,
    http: {
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      storeCors:
        process.env.STORE_CORS ||
        "http://localhost:8000,http://localhost:3000,http://localhost:5173",
      adminCors:
        process.env.ADMIN_CORS ||
        "http://localhost:9005,http://localhost:9000,http://localhost:7001",
      authCors:
        process.env.AUTH_CORS ||
        "http://localhost:9005,http://localhost:9000,http://localhost:7001,http://localhost:8000,http://localhost:3000,http://localhost:5173",
    },
  },
  admin: {
    disable: false,
    backendUrl,
    ...({ sources: [process.cwd()] } as unknown as Partial<import("@medusajs/types").AdminOptions>),
    vite: (config) => ({
      ...config,
      server: {
        ...(config?.server || {}),
        host: "0.0.0.0",
        origin: backendUrl,
        watch: {
          ignored: [
            "**/.medusa/**",
            "**/.cache/**",
            "**/logs/**",
            "**/node_modules/**",
            "**/.git/**",
          ],
        },
        hmr: {
          protocol: "ws",
          host: "localhost",
          clientPort: publicPort,
        },
      },
    }),
  },
  modules: [
    {
      resolve: "./src/modules/subscription",
    },
    {
      resolve: "./src/modules/plan-offer",
    },
    {
      resolve: "./src/modules/renewal",
    },
    {
      resolve: "./src/modules/dunning",
    },
    {
      resolve: "./src/modules/cancellation",
    },
    {
      resolve: "./src/modules/activity-log",
    },
    {
      resolve: "./src/modules/analytics",
    },
    {
      resolve: "./src/modules/settings",
    },
  ],
  plugins: [],
})
