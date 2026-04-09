import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import {
  fetchOrganization,
  fetchOrganizationMembers,
  fetchOrgConnections,
  fetchTenantRoles,
  createOrgMember,
  deleteOrgMember,
  setOrgMemberRole,
  createPasswordResetTicket,
} from "@/lib/management-api";
import type {
  AppRole,
  OrgMember,
  Organization,
  TenantRole,
} from "@/types/organization";
import AddMemberModal from "./AddMemberModal";
import DeleteMemberButton from "./DeleteMemberButton";
import ResetPasswordButton from "./ResetPasswordButton";
import RoleSelector from "./RoleSelector";
import { getHighestUserRole } from "@/lib/utils";
import { jwtDecode } from "jwt-decode";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const orgId = session.user.org_id as string | undefined;
  const roleNamespace = process.env.AUTH0_AUDIENCE + "/roles";

  // import decode idToken to get organisation roles
  const claims = session?.tokenSet?.idToken
    ? (jwtDecode(session.tokenSet.idToken) as Record<string, unknown>)
    : {};

  const rawRoles = claims[roleNamespace] as AppRole[] | undefined;
  const currentUserRole = getHighestUserRole(rawRoles);
  const canManageMembers =
    currentUserRole === "Admin" || currentUserRole === "Manager";

  const [org, members, connections, tenantRoles] = orgId
    ? await Promise.all([
        fetchOrganization(orgId),
        canManageMembers
          ? fetchOrganizationMembers(orgId, currentUserRole)
          : Promise.resolve([] as OrgMember[]),
        fetchOrgConnections(orgId),
        canManageMembers
          ? fetchTenantRoles(currentUserRole)
          : Promise.resolve([] as TenantRole[]),
      ])
    : ([null, [], [], []] as [
        Organization | null,
        OrgMember[],
        never[],
        TenantRole[],
      ]);

  async function deleteMember(formData: FormData) {
    "use server";
    if (!orgId) return { error: "No organisation in session." };
    const userId = formData.get("userId") as string;
    try {
      await deleteOrgMember(orgId, userId);
      return {};
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete member.";
      return { error: message };
    }
  }

  async function addMember(formData: FormData) {
    "use server";
    if (!orgId) return { error: "No organisation in session." };
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;
    const connectionName = formData.get("connectionName") as string;
    const email = (formData.get("email") as string) || undefined;
    const username = (formData.get("username") as string) || undefined;
    const roleId = formData.get("roleId") as string;
    try {
      await createOrgMember({
        orgId,
        connectionName,
        name,
        email,
        username,
        password,
        roleId,
      });
      return {};
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to add member.";
      return { error: message };
    }
  }

  async function resetPassword(formData: FormData) {
    "use server";
    const userId = formData.get("userId") as string;
    try {
      const url = await createPasswordResetTicket(
        userId,
        `${process.env.APP_BASE_URL}/dashboard`,
      );
      return { url };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create reset link.";
      return { error: message };
    }
  }

  async function changeRole(formData: FormData) {
    "use server";
    if (!orgId) return { error: "No organisation in session." };
    const userId = formData.get("userId") as string;
    const roleId = formData.get("roleId") as string;
    const prevRoleId = (formData.get("prevRoleId") as string) || undefined;
    try {
      await setOrgMemberRole(orgId, userId, roleId, prevRoleId);
      return {};
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to change role.";
      return { error: message };
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {org && (
            <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-2">
              {org.display_name || org.name}
            </p>
          )}
          <h1 className="text-3xl font-semibold text-gray-900 mb-6">
            Hello {session.user.name}
          </h1>
          <a
            href="/auth/logout"
            className="inline-block px-5 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Sign out
          </a>
        </div>

        {canManageMembers && orgId && connections.length === 0 && (
          <p className="text-center text-sm text-red-500 mb-4">
            No database connection is enabled for this organisation.
          </p>
        )}

        {canManageMembers && orgId && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Organization Members
              </h2>
              <AddMemberModal
                connections={connections}
                tenantRoles={tenantRoles}
                addMember={addMember}
              />
            </div>
            {members.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-500">
                No members found.
              </p>
            ) : (
              <ul>
                {members.map((member) => (
                  <li
                    key={member.user_id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0"
                  >
                    {member.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.picture}
                        alt={member.name}
                        width={36}
                        height={36}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 shrink-0">
                        {member.name ? member.name[0].toUpperCase() : "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.email}
                      </p>
                    </div>
                    {member.user_id !== session.user.sub && (
                      <>
                        <RoleSelector
                          member={member}
                          tenantRoles={tenantRoles}
                          changeRole={changeRole}
                        />
                        <ResetPasswordButton
                          member={member}
                          resetPassword={resetPassword}
                        />
                        <DeleteMemberButton
                          member={member}
                          deleteMember={deleteMember}
                        />
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!orgId && (
          <p className="text-center text-sm text-gray-500">
            No organization associated with this session.
          </p>
        )}
      </div>
    </main>
  );
}
