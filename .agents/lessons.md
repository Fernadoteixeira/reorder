# Lessons Learned

In this file, we record recurring patterns, encountered issues, and mistakes to avoid when working with the Reorder plugin.
It should be reviewed at the start of a session and updated after fixing any bug or resolving a complex issue.

## Rules for AI Agents

### Repository Language Constraint

- **Rule**: All files, code comments, documentation, specs, lessons, and commit messages added or modified in the repository on GitHub MUST be written in English. Even if the user interacts with you in another language (e.g., Portuguese or Polish), do not write non-English code comments, skill files, specs, or repository files.
- **Context**: The repository codebase and its meta-configuration (like AI agents instructions) must maintain a unified English language standard.

### Git Commits and Push Approval

- **Rule**: Before proposing a commit or git push to GitHub, always construct a Conventional Commits message format: `type(scope): description` and present it to the user. Wait for the user's explicit approval before proceeding with the commit and push.
- **Context**: Helps the user audit and accept individual changes, ensuring only well-formed commits with correct scopes are pushed.

## General Lessons

### Package Installation with Yarn 4 on Windows & Docker

- **Lesson**: When installing dependencies using Yarn Berry (v4) with `nodeLinker: node-modules`, built-in TypeScript compatibility patches can trigger hunk conflicts on TypeScript 5.7+ (`Cannot apply hunk #1`).
- **Rule**: Pin `"typescript": "5.6.2"` and add `"resolutions": { "typescript": "5.6.2" }` in `package.json`. Use `corepack yarn install --mode=skip-build` to bypass conflicting lifecycle patches and ensure clean linking into `node_modules`.

### Medusa v2 Module Registration & Admin Extension Sources in Root Plugin Config

- **Lesson**: In Medusa v2 development server configs (`medusa-config.ts`), custom domain modules must be registered in the `modules` array (`resolve: "./src/modules/<name>"`). Setting `plugins: []` prevents duplicate link loading, BUT causes `adminLoader` to leave `sources: []` empty, breaking `@medusajs/admin-vite-plugin` virtual module resolution (`virtual:medusa/*` returning HTML instead of JS).
- **Rule**: Declare all custom domain modules in `modules`, set `plugins: []`, and explicitly supply `...({ sources: [process.cwd()] } as unknown as Partial<AdminOptions>)` under `admin` in `medusa-config.ts`.

### PostgreSQL SSL Mode in Local Docker Containers

- **Lesson**: Medusa v2 module database connections default to SSL negotiation if unspecified, which causes `The server does not support SSL connections` when connecting to standard local PostgreSQL Docker images.
- **Rule**: Always supply `DATABASE_URL=postgres://.../dbname?sslmode=disable` and configure `databaseDriverOptions: { ssl: false }` in `medusa-config.ts`.

### TypeScript Compiler Options for Medusa v2 Workflows

- **Lesson**: Medusa v2 workflow step compensation types (`CompensateFn<T>`) accept `T | undefined` as input when compensation executes without return data. Enabling generic `"strict": true` causes TS2345 in compensation steps, while setting `"moduleResolution": "bundler"` breaks `"module": "Node16"`.
- **Rule**: Keep `"module": "Node16"`, `"moduleResolution": "Node16"`, and granular strict flags like `"strictNullChecks": true` in `tsconfig.json`.

### Customer Authentication in Store Integration Tests

- **Lesson**: Customer-authenticated store routes (`/store/customers/me/subscriptions/*`) require JWT tokens signed with `actor_type: "customer"` and `auth_identity_id` linked to the customer entity.
- **Rule**: Always use the shared `createCustomerAuthHeaders(container, customerId)` fixture helper to generate standard bearer authentication for customer storefront integration testing.
