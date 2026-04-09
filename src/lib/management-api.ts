import { ManagementClient } from "auth0";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
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

// --- Read ---

export async function fetchOrganizations(): Promise<Organization[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("orgs");

  const page = await managementClient.organizations.list({ take: PAGE_SIZE });
  return page.data.map((org) => ({
    id: org.id ?? "",
    name: org.name ?? "",
    display_name: org.display_name ?? org.name ?? "",
  }));
}

export async function fetchOrganization(orgId: string): Promise<Organization> {
  "use cache";
  cacheLife("hours");
  cacheTag(`org:${orgId}`);

  const org = await managementClient.organizations.get(orgId);
  return {
    id: org.id ?? "",
    name: org.name ?? "",
    display_name: org.display_name ?? org.name ?? "",
  };
}

async function fetchAllOrgMembers(orgId: string): Promise<OrgMember[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`org-members:${orgId}`);

  const page = await managementClient.organizations.members.list(orgId, {
    take: PAGE_SIZE,
  });
  const base = page.data.map((m) => ({
    user_id: m.user_id ?? "",
    name: m.name ?? "",
    email: m.email ?? "",
    picture: m.picture ?? "",
  }));
  return Promise.all(
    base.map(async (member) => {
      const rolesPage = await managementClient.organizations.members.roles.list(
        orgId,
        member.user_id,
      );
      return { ...member, role: rolesPage.data[0]?.name ?? undefined };
    }),
  );
}

export async function fetchOrganizationMembers(
  orgId: string,
  userRole: AppRole,
): Promise<OrgMember[]> {
  const all = await fetchAllOrgMembers(orgId);
  if (userRole === "Manager") return all.filter((u) => u.role !== "Admin");
  return all;
}

async function fetchAllTenantRoles(): Promise<TenantRole[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("tenant-roles");

  const page = await managementClient.roles.list();
  return page.data
    .filter((r): r is typeof r & { id: string; name: string } =>
      Boolean(r.id && r.name),
    )
    .map((r) => ({ id: r.id, name: r.name }));
}

export async function fetchTenantRoles(
  userRole: AppRole,
): Promise<TenantRole[]> {
  if (userRole === "User") return [];
  const all = await fetchAllTenantRoles();
  if (userRole === "Manager") return all.filter((r) => r.name !== "Admin");
  return all;
}

export async function fetchOrgConnections(
  orgId: string,
): Promise<OrgConnection[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`org-connections:${orgId}`);

  const page =
    await managementClient.organizations.enabledConnections.list(orgId);
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

// --- Write ---

export async function deleteOrgMember(
  orgId: string,
  userId: string,
): Promise<void> {
  await managementClient.organizations.members.delete(orgId, {
    members: [userId],
  });
  await managementClient.users.delete(userId);
  revalidateTag(`org-members:${orgId}`, "max");
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
  revalidateTag(`org-members:${params.orgId}`, "max");
}

export async function createPasswordResetTicket(
  userId: string,
  resultUrl: string,
): Promise<string> {
  const ticket = await managementClient.tickets.changePassword({
    user_id: userId,
    result_url: resultUrl,
  });
  return ticket.ticket ?? "";
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
  revalidateTag(`org-members:${orgId}`, "max");
}
