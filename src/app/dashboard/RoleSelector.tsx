"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrgMember, TenantRole } from "@/types/organization";

interface Props {
  member: OrgMember;
  tenantRoles: TenantRole[];
  changeRole: (formData: FormData) => Promise<{ error?: string }>;
}

const roleColors: Record<string, string> = {
  Admin: "text-purple-700 bg-purple-50 border-purple-200",
  Manager: "text-blue-700 bg-blue-50 border-blue-200",
  User: "text-gray-600 bg-gray-50 border-gray-200",
};

export default function RoleSelector({ member, tenantRoles, changeRole }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentRole = tenantRoles.find((r) => r.name === member.role);
  const colorClass =
    roleColors[member.role ?? ""] ?? roleColors["User"];

  function handleChange() {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await changeRole(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <form ref={formRef} onSubmit={handleSubmit}>
        <input type="hidden" name="userId" value={member.user_id} />
        <input type="hidden" name="prevRoleId" value={currentRole?.id ?? ""} />
        <span className={`inline-flex items-center rounded border text-xs font-medium ${colorClass}`}>
          {isPending ? (
            <span className="px-2 py-0.5">…</span>
          ) : (
            <select
              name="roleId"
              defaultValue={currentRole?.id ?? ""}
              onChange={handleChange}
              className={`bg-transparent border-none outline-none text-xs font-medium px-2 py-0.5 cursor-pointer ${colorClass}`}
            >
              {tenantRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </span>
      </form>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
