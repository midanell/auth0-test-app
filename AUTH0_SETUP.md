# Auth0 Dashboard Configuration

### 1. Regular Web Application

Create an application of type **Regular Web Application**.

- **Allowed Callback URLs:** `http://localhost:3000/auth/callback`
- **Allowed Logout URLs:** `http://localhost:3000`
- **Allowed Web Origins:** `http://localhost:3000`

Use its Client ID and Client Secret for `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET`.

### 2. API

In Auth0, an **API** (also called a Resource Server) represents a backend service that your application wants to call on behalf of a user. Registering one tells Auth0 to issue access tokens scoped to that service, and it gives those tokens a verifiable audience (`aud` claim) so your backend can reject tokens intended for someone else.

For this app the API registration serves one purpose: setting the `AUTH0_AUDIENCE` value, which is passed as the `audience` parameter during login so that Auth0 issues a JWT access token rather than an opaque token. Without it, Auth0 issues an opaque token that cannot be decoded on the client.

Create an API and set its **identifier** to the value you want to use as `AUTH0_AUDIENCE` (e.g. `https://your-api-identifier`). The identifier is just a unique string — it does not need to be a reachable URL, though a URL is the convention.

> **Note:** If you only need org roles injected into the ID token and have no other use for a scoped access token, you can skip this step and leave `AUTH0_AUDIENCE` unset. The Login Action and role-based access control will still work without it.

### 3. Machine-to-Machine Application

Create a separate application of type **Machine to Machine**, authorized against the **Auth0 Management API**, with the following scopes:

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

Use its Client ID and Client Secret for `AUTH0_MANAGEMENT_CLIENT_ID` / `AUTH0_MANAGEMENT_CLIENT_SECRET`.

The Management Client is instantiated once as a module-level singleton so the M2M token is cached and reused across requests rather than fetched on every call.

### 4. Roles

Create three roles in **User Management → Roles**:

- `Admin`
- `Manager`
- `User`

The names must match exactly — the app compares role names as strings.

### 5. Organizations

Enable the **Organizations** feature on your tenant. Create at least one organization and:

- Enable a **Database connection** on the organization (required for the Add Member flow — the app only supports `auth0` strategy connections).
- Add members and assign them one of the three roles above.

### 6. Login Action — inject roles into the ID token

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
