"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrgConnection, TenantRole } from "@/types/organization";

interface Props {
  connections: OrgConnection[];
  tenantRoles: TenantRole[];
  addMember: (formData: FormData) => Promise<{ error?: string }>;
}

export default function AddMemberModal({ connections, tenantRoles, addMember }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConnectionName, setSelectedConnectionName] = useState(
    connections[0]?.name ?? ""
  );

  if (connections.length === 0 || tenantRoles.length === 0) {
    return null;
  }

  const selectedConnection =
    connections.find((c) => c.name === selectedConnectionName) ?? connections[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await addMember(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false);
      router.refresh();
    }
  }

  const inputClass =
    "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError(null);
          setSelectedConnectionName(connections[0]?.name ?? "");
        }}
        className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 text-lg leading-none transition-colors"
        aria-label="Add member"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Add Member
            </h3>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {connections.length > 1 && (
                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Connection
                  <select
                    name="connectionName"
                    required
                    value={selectedConnectionName}
                    onChange={(e) => setSelectedConnectionName(e.target.value)}
                    className={inputClass}
                  >
                    {connections.map((c) => (
                      <option key={c.connection_id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {connections.length === 1 && (
                <input
                  type="hidden"
                  name="connectionName"
                  value={connections[0].name}
                />
              )}

              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Name
                <input
                  name="name"
                  type="text"
                  required
                  className={inputClass}
                />
              </label>

              {selectedConnection.requires_username ? (
                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Username
                  <input
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    className={inputClass}
                  />
                </label>
              ) : (
                <label className="flex flex-col gap-1 text-sm text-gray-700">
                  Email
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={inputClass}
                  />
                </label>
              )}

              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Password
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-gray-700">
                Role
                <select name="roleId" required className={inputClass}>
                  {tenantRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-2 mt-1 justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {pending ? "Adding…" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
