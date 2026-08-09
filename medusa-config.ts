import { defineConfig, loadEnv } from "@medusajs/framework/utils"
import path from "path"

const projectRoot = __dirname

loadEnv(process.env.NODE_ENV || "development", projectRoot)

module.exports = defineConfig({
  projectConfig: {
    databaseUrl:
      process.env.DATABASE_URL ||
      "postgres://postgres:postgres@localhost:5432/medusa-reorder",
    redisUrl: process.env.REDIS_URL,
    http: {
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      storeCors:
        process.env.STORE_CORS ||
        "http://localhost:8000,http://localhost:3000,http://localhost:5173",
      adminCors:
        process.env.ADMIN_CORS ||
        "http://localhost:9000,http://localhost:7001",
      authCors:
        process.env.AUTH_CORS ||
        "http://localhost:9000,http://localhost:7001,http://localhost:8000,http://localhost:3000,http://localhost:5173",
    },
  },
  admin: {
    disable: false,
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  },
  plugins: [
    {
      resolve: projectRoot,
      options: {},
    },
  ],
})
