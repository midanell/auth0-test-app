# Auth0 Dashboard Configuration

### 1. Regular Web Application

Create an application of type **Regular Web Application**.

- **Allowed Callback URLs:** `http://localhost:3000/auth/callback`
- **Allowed Logout URLs:** `http://localhost:3000`
- **Allowed Web Origins:** `http://localhost:3000`

Use its Client ID and Client Secret for `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET`.

### 2. API

Create an API with the identifier you want to use as `AUTH0_AUDIENCE` (e.g. `https://your-api-identifier`). The value is used both as the OAuth audience and as the prefix for the custom roles claim namespace.

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
  const namespace = "https://your-app.com";

  if (event.authorization) {
    const orgRoles = event.authorization.roles ?? [];
    api.idToken.setCustomClaim(`${namespace}/roles`, orgRoles);
    api.accessToken.setCustomClaim(`${namespace}/roles`, orgRoles);
  }
};
```

Deploy the action and add it to the **Login** flow. Without this, the dashboard will treat every user as `User` regardless of their assigned role.
