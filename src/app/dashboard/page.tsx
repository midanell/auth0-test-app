import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { fetchOrganization, fetchOrganizationMembers } from "@/lib/management-api";
import type { OrgMember, Organization } from "@/types/organization";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const orgId = session.user.org_id as string | undefined;
  const [org, members]: [Organization | null, OrgMember[]] = orgId
    ? await Promise.all([fetchOrganization(orgId), fetchOrganizationMembers(orgId)])
    : [null, []];

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

        {orgId && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Organization Members
              </h2>
            </div>
            {members.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-500">No members found.</p>
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
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                    </div>
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
