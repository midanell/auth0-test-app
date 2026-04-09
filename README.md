# Auth0 Next.js Multi-Organization App

A Next.js 16 application that demonstrates Auth0 multi-organization authentication with role-based member management. Admins and Managers can invite, remove, and reassign roles for members of their organization directly from the app.

---

## Quickstart

### In the Auth0 dashboard

1. **Create a Regular Web Application** — this represents the Next.js app. See [AUTH0_SETUP.md §1](./AUTH0_SETUP.md#1-regular-web-application).
2. **Register an API** — optional, but required if you want a scoped JWT access token. See [AUTH0_SETUP.md §2](./AUTH0_SETUP.md#2-api).
3. **Create a Machine-to-Machine application** and authorize it against the Auth0 Management API with the required scopes. See [AUTH0_SETUP.md §3](./AUTH0_SETUP.md#3-machine-to-machine-application-and-the-management-api).
4. **Create the three roles** — `Admin`, `Manager`, and `User`. See [AUTH0_SETUP.md §4](./AUTH0_SETUP.md#4-roles).
5. **Create a Database Connection** and enable it for both your Regular Web Application and your organization. See [AUTH0_SETUP.md §5](./AUTH0_SETUP.md#5-database-connection).
6. **Enable Organizations** and create at least one organization with members assigned to roles. See [AUTH0_SETUP.md §6](./AUTH0_SETUP.md#6-organizations).
7. **Add a Login Action** to inject org roles into the ID token. See [AUTH0_SETUP.md §7](./AUTH0_SETUP.md#7-login-action--inject-roles-into-the-id-token).

### Running the app

1. `npm install`
2. Copy your credentials into `.env.local` — see [Environment variables](#environment-variables-envlocal) below.
3. `npm run dev` and open [http://localhost:3000/orgs](http://localhost:3000/orgs).

---

## What the app does

| Route | Behaviour |
|---|---|
| `/orgs` | Public page listing all Auth0 organizations. Clicking one starts the login flow scoped to that org. Authenticated users are redirected straight to `/dashboard`. |
| `/auth/login`, `/auth/logout`, `/auth/callback` | Handled automatically by the `@auth0/nextjs-auth0` middleware — no route files exist for these. |
| `/dashboard` | Post-login landing page. Shows the logged-in user's name and organization. Admins and Managers also see the full member list with controls to add, remove, and change roles. |

### Role hierarchy

Three roles exist in the tenant: **Admin**, **Manager**, and **User**.

- **Admin** — sees all members and all roles; can assign any role including Admin.
- **Manager** — sees all members *except* Admins; can assign Manager or User only.
- **User** — no member management UI at all.

A user can never modify or remove themselves, regardless of role.

Roles are read from the **ID token** (not the access token) under a custom claim namespace equal to `AUTH0_AUDIENCE + "/roles"`. The app decodes the raw ID token with `jwtDecode` to extract them, since `session.user` does not expose custom claims directly.

### Mutations

All writes (add member, delete member, change role) are implemented as Next.js Server Actions defined inline in the dashboard Server Component. Client components (`AddMemberModal`, `DeleteMemberButton`, `RoleSelector`) receive these actions as props, call them, then call `router.refresh()` to re-fetch server state.

**Add member** creates an Auth0 user, adds them to the org, and assigns their role — three sequential Management API calls.

**Delete member** removes the user from the org *and* permanently deletes the Auth0 user account.

**Change role** removes the previous role then assigns the new one.

**Reset password** (Admins and Managers only) generates a one-time Auth0 password-change ticket via the Management API. Clicking the lock icon next to a member produces a URL; copying it and sending it to the user out-of-band lets them set a new password without the app ever handling the credential. After they complete the flow, Auth0 redirects them back to `/dashboard`. The link is single-use and expires according to the tenant's ticket TTL setting.

---

## Running locally

```bash
npm install
# configure .env.local (see below)
npm run dev
```

Open [http://localhost:3000/orgs](http://localhost:3000/orgs) to pick an organization and log in.

### Environment variables (`.env.local`)

```env
# Regular Web Application
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_AUDIENCE=https://your-api-identifier
AUTH0_ROLES_NAMESPACE=https://your-roles-namespace

# Session encryption — generate with: openssl rand -hex 32
AUTH0_SECRET=...

# No trailing slash
APP_BASE_URL=http://localhost:3000

# Machine-to-Machine Application
AUTH0_MANAGEMENT_CLIENT_ID=...
AUTH0_MANAGEMENT_CLIENT_SECRET=...
```

---

## Rate limiting and caching

### Why rate limiting is a problem

The Auth0 Management API enforces a global rate limit shared across the entire tenant. Every call to list members, fetch roles, or look up connection details counts against this limit. Two patterns in the member list make this particularly easy to hit:

**N+1 role fetches** — fetching the member list for an org with N members fires one `members.list` call followed by N concurrent `members.roles.list` calls (one per member). With 20 members, that's 21 requests in a single burst. Multiple admins loading the dashboard at the same time multiplies this further.

**N+1 connection fetches** — `fetchOrgConnections` follows a similar pattern: one call to list enabled connections, then one `connections.get` call per connection to read its details.

On Auth0's free and developer tiers the global limit is low enough that even a handful of concurrent page loads can produce `429 Too Many Requests` errors.

### How caching addresses it

All Management API read functions in `src/lib/management-api.ts` use Next.js 16's `"use cache"` directive, which requires `cacheComponents: true` in `next.config.ts`. This caches each function's return value independently at the framework level, persisting across requests and (when deployed to a long-running server) across multiple users.

| Cached function | Cache tag | Profile |
|---|---|---|
| `fetchOrganizations` | `orgs` | `minutes` |
| `fetchOrganization(orgId)` | `org:{orgId}` | `hours` |
| `fetchAllOrgMembers(orgId)` | `org-members:{orgId}` | `minutes` |
| `fetchAllTenantRoles` | `tenant-roles` | `hours` |
| `fetchOrgConnections(orgId)` | `org-connections:{orgId}` | `hours` |

The `minutes` profile (1-minute background revalidate, 1-hour expiry) is used for member data since it changes most frequently. Slower-changing data like org details, roles, and connection configuration uses `hours` (1-hour background revalidate, 1-day expiry).

**Filtering after the cache hit** — `fetchOrganizationMembers` and `fetchTenantRoles` both filter results based on the caller's role (Managers don't see Admins). Rather than caching per role — which would create duplicate entries — the full unfiltered data is cached once by the private `fetchAllOrgMembers` and `fetchAllTenantRoles` helpers, and filtering is applied after the cache is read. This means a single cache entry serves both Admins and Managers.

### Mutation invalidation

Because the cache persists across requests, mutations must explicitly invalidate affected entries so the next page load reflects the change immediately rather than waiting for TTL expiry. Each write function calls `revalidateTag` with `"max"` after completing its API calls:

| Mutation | Invalidates |
|---|---|
| `createOrgMember` | `org-members:{orgId}` |
| `deleteOrgMember` | `org-members:{orgId}` |
| `setOrgMemberRole` | `org-members:{orgId}` |

`revalidateTag(..., "max")` marks the entry as stale rather than immediately evicting it, so the next visitor is served the stale response while fresh data is fetched in the background (stale-while-revalidate). The client components call `router.refresh()` after mutations, which causes the dashboard to re-render with the freshly invalidated data.

---

## Auth0 dashboard configuration

See [AUTH0_SETUP.md](./AUTH0_SETUP.md) for the full step-by-step guide covering the Regular Web App, API, Machine-to-Machine app, roles, organizations, and the Login Action required to inject roles into the ID token.
