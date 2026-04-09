# Auth0 Dashboard Configuration

### 1. Regular Web Application

#### What a Regular Web Application is

A **Regular Web Application** in Auth0 represents a traditional server-rendered app where the backend exchanges credentials with Auth0 directly, rather than the browser doing so. It uses the **Authorization Code flow**: when a user logs in, Auth0 redirects them back to your server with a short-lived code, and your server exchanges that code for tokens using its Client Secret. The secret never leaves the server, which is what makes this flow secure.

This is the correct application type for a Next.js app. It is distinct from a **Single Page Application** (SPA), which runs entirely in the browser and cannot safely hold a secret, and from a **Machine-to-Machine** app, which has no user involved at all.

The `@auth0/nextjs-auth0` SDK handles the Authorization Code flow automatically — the callback exchange, session creation, and token storage are all managed for you by the middleware configured in `src/proxy.ts`.

#### Creating the application

1. Go to **Applications → Applications** and click **Create Application**.
2. Choose **Regular Web Applications** as the type and give it a name.
3. Click **Create**.

#### Configuring allowed URLs

Auth0 will only redirect users to URLs you have explicitly whitelisted. Go to the application's **Settings** tab and fill in:

- **Allowed Callback URLs:** `http://localhost:3000/auth/callback`
  The URL Auth0 redirects to after a successful login. Must match the `/auth/callback` route handled by the SDK middleware.
- **Allowed Logout URLs:** `http://localhost:3000`
  The URL Auth0 redirects to after logout. Auth0 will refuse to redirect anywhere that isn't listed here.
- **Allowed Web Origins:** `http://localhost:3000`
  Required for the SDK to silently check session state from the browser.

For production, add your production URLs to each field alongside the localhost entries (Auth0 accepts comma-separated lists).

#### Login Experience

Under **Applications → [your Regular Web Application] → Login Experience**, the **Login Flow** option controls how the login flow will be configured:

- **No Prompt** (recommended for this app) — Auth0 uses the organization context silently, which is sent as search param to the login route. The user just sees a standard login form based on the organization configuration.

#### Credentials

After saving, copy the **Client ID** and **Client Secret** from the Settings tab into your `.env.local` as `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`. The Client Secret must be kept server-side only — never expose it to the browser.

### 2. API

In Auth0, an **API** (also called a Resource Server) represents a backend service that your application wants to call on behalf of a user. Registering one tells Auth0 to issue access tokens scoped to that service, and it gives those tokens a verifiable audience (`aud` claim) so your backend can reject tokens intended for someone else.

For this app the API registration serves one purpose: setting the `AUTH0_AUDIENCE` value, which is passed as the `audience` parameter during login so that Auth0 issues a JWT access token rather than an opaque token. Without it, Auth0 issues an opaque token that cannot be decoded on the client.

Create an API and set its **identifier** to the value you want to use as `AUTH0_AUDIENCE` (e.g. `https://your-api-identifier`). The identifier is just a unique string — it does not need to be a reachable URL, though a URL is the convention.

> **Note:** If you only need org roles injected into the ID token and have no other use for a scoped access token, you can skip this step and leave `AUTH0_AUDIENCE` unset. The Login Action and role-based access control will still work without it.

### 3. Machine-to-Machine Application and the Management API

#### What the Management API is

The **Auth0 Management API** is Auth0's own REST API for administering a tenant programmatically — creating users, managing organizations, assigning roles, and so on. It is separate from any API you register yourself (step 2). It lives at `https://YOUR_DOMAIN/api/v2/` and is always present on every Auth0 tenant.

Access to the Management API is controlled by OAuth scopes. A caller must present a valid access token with the specific scopes required for each operation. This means you cannot call it directly from a browser or from user-issued tokens — you need a server-side client with its own credentials.

#### What a Machine-to-Machine application is

A **Machine-to-Machine (M2M) application** in Auth0 represents a server-side client that calls an API directly, without a user being involved. It authenticates using the **Client Credentials flow**: it sends its Client ID and Client Secret to Auth0 and receives a short-lived access token in return. That token is then attached to Management API requests.

This is distinct from the Regular Web Application (step 1), which acts on behalf of a logged-in user. The M2M app acts on behalf of itself — it is the server calling Auth0 to manage your tenant's data.

#### Creating and authorizing the application

1. Go to **Applications → Applications** and click **Create Application**.
2. Choose **Machine to Machine Applications** as the type.
3. On the next screen you are prompted to select an API to authorize against — choose **Auth0 Management API**.
4. A scope selector appears. Enable the scopes listed in the table below, then click **Authorize**.

> You can revisit the authorized scopes at any time via **Applications → [your M2M app] → APIs → Auth0 Management API**.

| Scope                              | Used for                                          |
| ---------------------------------- | ------------------------------------------------- |
| `read:organizations`               | Listing organizations on `/orgs`                  |
| `read:organization_members`        | Fetching org member list                          |
| `read:organization_member_roles`   | Reading each member's current role                |
| `create:organization_members`      | Adding a new member to an org                     |
| `delete:organization_members`      | Removing a member from an org                     |
| `create:organization_member_roles` | Assigning a role to a member                      |
| `delete:organization_member_roles` | Removing a role from a member                     |
| `read:roles`                       | Listing available tenant roles                    |
| `read:connections`                 | Checking connection details (username/email mode) |
| `create:users`                     | Creating a new Auth0 user                         |
| `delete:users`                     | Deleting a user when removed from the org         |
| `create:user_tickets`              | Generating password reset links                   |

Use the M2M application's **Client ID** and **Client Secret** for `AUTH0_MANAGEMENT_CLIENT_ID` / `AUTH0_MANAGEMENT_CLIENT_SECRET`.

#### How the token is managed in this app

When the app starts, the `auth0` SDK's `ManagementClient` is instantiated once as a module-level singleton using the M2M credentials. The SDK handles fetching and refreshing the M2M access token automatically — tokens are short-lived (typically 24 hours) and the SDK will re-authenticate transparently when one expires. Keeping the client as a singleton avoids fetching a new token on every request.

### 4. Roles

Create three roles in **User Management → Roles**:

- `Admin`
- `Manager`
- `User`

The names must match exactly — the app compares role names as strings.

### 5. Database Connection

A **Database Connection** in Auth0 stores usernames, emails, and hashed passwords directly in Auth0's managed database. It is the connection type this app uses when creating new members via the Add Member form (the app only supports the `auth0` strategy — social or enterprise connections are not supported for member creation).

#### Create the connection

Go to **Authentication → Database** and click **Create DB Connection**. Give it a name (e.g. `Username-Password-Authentication` is the default, but you can create additional ones). Under the connection settings you can optionally enable **Requires Username** — if enabled, the Add Member form will prompt for a username instead of an email address.

#### Allow an application to use it

A connection must be explicitly enabled for each application that should use it. Go to the connection's **Applications** tab and toggle on your **Regular Web Application** (the one from step 1). Without this, login attempts through that application will fail even if the connection exists.

#### Enable it on an organization

Connections must also be enabled per organization. Go to **Organizations → [your org] → Connections** and click **Enable Connection**, then select the database connection you created. This is required for the Add Member flow — `fetchOrgConnections` in the app only returns connections that are both enabled on the org and use the `auth0` strategy.

If no database connection is enabled on the org, the Add Member button will not appear and a warning will be shown on the dashboard instead.

### 6. Organizations

#### Creating an organization

Go to **Organizations** and click **Create Organization**. Each organization has two name fields:

- **Name** — a lowercase, slug-style identifier (e.g. `acme-corp`). Used in Management API calls when referencing the org by name, but this is **not** the value stored as `org_id` in the session. It cannot contain spaces.
- **Display Name** — a human-readable label (e.g. `Acme Corp`). This is what the app shows on the dashboard and the `/orgs` picker page.

Auth0 also assigns each organization an opaque internal identifier of the form `org_XXXXXXXXXXXXXXXXX` (e.g. `org_9ybsU1dN2dKfDkBi`). This is the value stored as `org_id` in the session token and used when scoping a login to a specific organization. The human-readable Name slug can optionally appear as `org_name` in tokens, but only if explicitly enabled in tenant settings.

After creating the organization:

- Enable a database connection on the organization (see step 5).
- Add members and assign them one of the three roles above.

#### Login experience

When a user clicks an organization on the `/orgs` page, the app redirects them to `/auth/login?organization=<org_internal_id>`, where `<org_internal_id>` is Auth0's opaque identifier for that org (the `org_XXXXXXXXXXXXXXXXX`-formatted value, not the human-readable Name slug). The `organization` parameter tells Auth0 to scope the login session to that specific organization — the resulting tokens will contain an `org_id` claim set to this same internal identifier, and only members of that organization can complete the login.

If a user who is not a member of the selected organization attempts to log in, Auth0 will return an error and deny access.

#### Branding

Each organization can have its own visual identity applied to the Auth0 Universal Login page, overriding the tenant-level theme for members of that org. Go to **Organizations → [your org] → Branding** to configure:

- **Logo URL** — displayed at the top of the login form. Must be a publicly accessible image URL.
- **Primary Color** — used for the login button and interactive elements.
- **Background Color** — the page background behind the login card.

Org-level branding only applies when the login is scoped to that organization (i.e. when the `organization` parameter is present in the login URL). Logins without an org context use the tenant-level Universal Login theme configured under **Branding → Universal Login**.

### 7. Login Action — inject roles into the ID token

The app reads organization roles from a custom claim on the ID token. Add a **Login / Post Login** Action with the following code:

```js
exports.onExecutePostLogin = async (event, api) => {
  const namespace = "https://your-roles-namespace"; // must match AUTH0_ROLES_NAMESPACE in .env.local

  if (event.authorization) {
    const orgRoles = event.authorization.roles ?? [];
    api.idToken.setCustomClaim(`${namespace}/roles`, orgRoles);
  }
};
```

The value of `namespace` must exactly match the `AUTH0_ROLES_NAMESPACE` environment variable in your app. It is independent of `AUTH0_AUDIENCE` — you can set it to any URL-shaped string (e.g. `https://your-app.com`). However, you can also use the same namespace if you want.

Deploy the action and add it to the **Login** flow. Without this, the dashboard will treat every user as `User` regardless of their assigned role.
