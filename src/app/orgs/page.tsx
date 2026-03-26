import { fetchOrganizations } from "@/lib/management-api";

export const dynamic = "force-dynamic";

export default async function OrgsPage() {
  const orgs = await fetchOrganizations();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
          Select your organization
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Choose the organization you want to log in to.
        </p>
        <ul className="space-y-3">
          {orgs.map((org) => (
            <li key={org.id}>
              <a
                href={`/auth/login?organization=${org.id}`}
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg border border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm transition-all text-gray-800 font-medium"
              >
                <span>{org.display_name || org.name}</span>
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            </li>
          ))}
        </ul>
        {orgs.length === 0 && (
          <p className="text-center text-gray-400 mt-8">
            No organizations found.
          </p>
        )}
      </div>
    </main>
  );
}
