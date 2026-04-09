# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture

**Stack:** Next.js 16.2.1 (App Router), React 19, TypeScript, Tailwind CSS v4, `@auth0/nextjs-auth0` v4, `auth0` v5 Management SDK.

### Auth flow

- `src/proxy.ts` exports the middleware (matched against all non-static routes) — it delegates entirely to `auth0.middleware`.
- `src/lib/auth0.ts` creates the `Auth0Client` singleton. After login it redirects to `/dashboard`; the `AUTH0_AUDIENCE` env var sets the API audience.
- Layout wraps everything in `<Auth0Provider>` (client-side context for hooks).
- Auth routes (`/auth/login`, `/auth/logout`, `/auth/callback`) are handled automatically by the SDK middleware — no route files exist for them.

### Role-based access control

Roles (`Admin`, `Manager`, `User`) are Auth0 organization roles assigned per-org. They are injected into the **ID token** under the custom claim namespace `AUTH0_AUDIENCE + "/roles"`. To read them, decode the raw `idToken` with `jwtDecode` (not from `session.user`, which doesn't carry custom claims directly).

`getHighestUserRole` in `src/lib/utils.ts` collapses the roles array into a single effective role (Admin > Manager > User).

Access rules:
- Only `Admin` and `Manager` can see/manage org members.
- `Manager` cannot see or assign the `Admin` role — filtered in `fetchOrganizationMembers` and `fetchTenantRoles`.
- Users cannot modify or remove their own membership (enforced in the dashboard UI by comparing `member.user_id` to `session.user.sub`).

### Management API (`src/lib/management-api.ts`)

Uses the `auth0` npm package's `ManagementClient` (v5), instantiated once as a **module-level singleton** to reuse the M2M token across requests. All functions here are server-only.

Key operations: `fetchOrganizations`, `fetchOrganization`, `fetchOrganizationMembers`, `fetchOrgConnections`, `fetchTenantRoles`, `createOrgMember`, `deleteOrgMember`, `setOrgMemberRole`.

`createOrgMember` creates the Auth0 user, adds them to the org, then assigns their role — three sequential Management API calls.

`deleteOrgMember` removes the user from the org **and** deletes the Auth0 user account.

### Pages and mutations

- `/orgs` — public org picker (redirects authenticated users to `/dashboard`).
- `/dashboard` — server component; reads session, fetches org data in parallel, defines Server Actions (`addMember`, `deleteMember`, `changeRole`) inline using `"use server"`.
- Client components (`AddMemberModal`, `DeleteMemberButton`, `RoleSelector`) receive Server Actions as props and call `router.refresh()` after mutations to re-render server state.

### Environment variables

| Variable | Purpose |
|---|---|
| `AUTH0_DOMAIN` | Auth0 tenant domain |
| `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` | Regular Web App credentials |
| `AUTH0_AUDIENCE` | API audience (also used as role namespace prefix) |
| `AUTH0_SECRET` | Session cookie encryption key |
| `APP_BASE_URL` | App base URL (no trailing slash) |
| `AUTH0_MANAGEMENT_CLIENT_ID` / `AUTH0_MANAGEMENT_CLIENT_SECRET` | M2M app credentials for Management API |
