# Auth0 Next.js Multi-Organization App

A Next.js 16 application that demonstrates Auth0 multi-organization authentication with role-based member management. Admins and Managers can invite, remove, and reassign roles for members of their organization directly from the app.

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

# Session encryption — generate with: openssl rand -hex 32
AUTH0_SECRET=...

# No trailing slash
APP_BASE_URL=http://localhost:3000

# Machine-to-Machine Application
AUTH0_MANAGEMENT_CLIENT_ID=...
AUTH0_MANAGEMENT_CLIENT_SECRET=...
```

---

## Auth0 dashboard configuration

See [AUTH0_SETUP.md](./AUTH0_SETUP.md) for the full step-by-step guide covering the Regular Web App, API, Machine-to-Machine app, roles, organizations, and the Login Action required to inject roles into the ID token.
