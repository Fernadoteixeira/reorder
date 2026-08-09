# Lessons Learned

In this file, we record recurring patterns, encountered issues, and mistakes to avoid when working with the Reorder plugin.
It should be reviewed at the start of a session and updated after fixing any bug or resolving a complex issue.

## Rules for AI Agents

### Repository Language Constraint

- **Rule**: All files, code comments, documentation, specs, lessons, and commit messages added or modified in the repository on GitHub MUST be written in English. Even if the user interacts with you in another language (e.g., Polish), do not write Polish code comments, skill files, specs, or repository files.
- **Context**: The repository codebase and its meta-configuration (like AI agents instructions) must maintain a unified English language standard.

### Git Commits and Push Approval

- **Rule**: Before proposing a commit or git push to GitHub, always construct a Conventional Commits message format: `type(scope): description` and present it to the user. Wait for the user's explicit approval before proceeding with the commit and push.
- **Context**: Helps the user audit and accept individual changes, ensuring only well-formed commits with correct scopes are pushed.

## General Lessons

### Package Installation with Yarn 4 on Windows

- **Lesson**: When installing dependencies using Yarn Berry (v4) with `nodeLinker: node-modules`, built-in TypeScript compatibility patches can trigger hunk conflicts on certain platforms.
- **Rule**: Use `corepack yarn install --mode=skip-build` to bypass conflicting lifecycle patches and ensure clean linking into `node_modules`.

### Customer Authentication in Store Integration Tests

- **Lesson**: Customer-authenticated store routes (`/store/customers/me/subscriptions/*`) require JWT tokens signed with `actor_type: "customer"` and `auth_identity_id` linked to the customer entity.
- **Rule**: Always use the shared `createCustomerAuthHeaders(container, customerId)` fixture helper to generate standard bearer authentication for customer storefront integration testing.

