import { ManagementClient } from "auth0";
import type {
  Organization,
  OrgMember,
  OrgConnection,
  TenantRole,
  AppRole,
} from "@/types/organization";

const PAGE_SIZE = 50;

function createManagementClient(): ManagementClient {
  const {
    AUTH0_DOMAIN,
    AUTH0_MANAGEMENT_CLIENT_ID,
    AUTH0_MANAGEMENT_CLIENT_SECRET,
  } = process.env;
  if (
    !AUTH0_DOMAIN ||
    !AUTH0_MANAGEMENT_CLIENT_ID ||
    !AUTH0_MANAGEMENT_CLIENT_SECRET
  ) {
    throw new Error("Missing Management API environment variables.");
  }
  return new ManagementClient({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_MANAGEMENT_CLIENT_ID,
    clientSecret: AUTH0_MANAGEMENT_CLIENT_SECRET,
  });
}

const managementClient: ManagementClient = createManagementClient();

export async function fetchOrganizations(): Promise<Organization[]> {
  const page = await managementClient.organizations.list({ take: PAGE_SIZE });
  return page.data.map((org) => ({
    id: org.id ?? "",
    name: org.name ?? "",
    display_name: org.display_name ?? org.name ?? "",
  }));
}

export async function fetchOrganization(orgId: string): Promise<Organization> {
  const org = await managementClient.organizations.get(orgId);
  return {
    id: org.id ?? "",
    name: org.name ?? "",
    display_name: org.display_name ?? org.name ?? "",
  };
}

export async function fetchOrganizationMembers(
  orgId: string,
  userRole: AppRole,
): Promise<OrgMember[]> {
  const page = await managementClient.organizations.members.list(orgId, {
    take: PAGE_SIZE,
  });
  const base = page.data.map((m) => ({
    user_id: m.user_id ?? "",
    name: m.name ?? "",
    email: m.email ?? "",
    picture: m.picture ?? "",
  }));
  const users = await Promise.all(
    base.map(async (member) => {
      const rolesPage = await managementClient.organizations.members.roles.list(
        orgId,
        member.user_id,
      );
      return { ...member, role: rolesPage.data[0]?.name ?? undefined };
    }),
  );
  if (userRole === "Manager") {
    return users.filter((user) => user.role !== "Admin");
  }
  return users;
}

export async function fetchTenantRoles(
  userRole: AppRole,
): Promise<TenantRole[]> {
  if (userRole === "User") return [];

  const page = await managementClient.roles.list();
  return page.data
    .filter((r) => {
      if (!(r.id && r.name)) return false;
      if (userRole === "Manager") return r.name !== "Admin";
      return true;
    })
    .map((r) => ({ id: r.id!, name: r.name! }));
}

export async function fetchOrgConnections(
  orgId: string,
): Promise<OrgConnection[]> {
  const page = await managementClient.organizations.enabledConnections.list(orgId);
  const dbConnections = page.data.filter(
    (c) => c.connection?.strategy === "auth0",
  );
  return Promise.all(
    dbConnections.map(async (c) => {
      const connectionId = c.connection_id ?? "";
      let requires_username = false;
      if (connectionId) {
        const details = await managementClient.connections.get(connectionId);
        const options = details.options as
          | Record<string, Record<string, unknown>>
          | undefined;
        requires_username = Boolean(options?.attributes?.username);
      }
      return {
        connection_id: connectionId,
        name: c.connection?.name ?? "",
        requires_username,
      };
    }),
  );
}

export async function deleteOrgMember(
  orgId: string,
  userId: string,
): Promise<void> {
  await managementClient.organizations.members.delete(orgId, { members: [userId] });
  await managementClient.users.delete(userId);
}

export async function createOrgMember(params: {
  orgId: string;
  connectionName: string;
  name: string;
  email?: string;
  username?: string;
  password: string;
  roleId: string;
}): Promise<void> {
  const user = await managementClient.users.create({
    connection: params.connectionName,
    name: params.name,
    ...(params.username
      ? { username: params.username }
      : { email: params.email, email_verified: false }),
    password: params.password,
  });
  await managementClient.organizations.members.create(params.orgId, {
    members: [user.user_id ?? ""],
  });
  await managementClient.organizations.members.roles.assign(
    params.orgId,
    user.user_id ?? "",
    { roles: [params.roleId] },
  );
}

export async function setOrgMemberRole(
  orgId: string,
  userId: string,
  newRoleId: string,
  prevRoleId?: string,
): Promise<void> {
  if (prevRoleId) {
    await managementClient.organizations.members.roles.delete(orgId, userId, {
      roles: [prevRoleId],
    });
  }
  await managementClient.organizations.members.roles.assign(orgId, userId, {
    roles: [newRoleId],
  });
}
