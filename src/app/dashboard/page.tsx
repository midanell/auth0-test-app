import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
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
    </main>
  );
}
