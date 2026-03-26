"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrgMember } from "@/types/organization";

interface Props {
  member: OrgMember;
  deleteMember: (formData: FormData) => Promise<{ error?: string }>;
}

export default function DeleteMemberButton({ member, deleteMember }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await deleteMember(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="ml-auto flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors text-base leading-none shrink-0"
        aria-label={`Delete ${member.name}`}
      >
        ×
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="ml-auto flex items-center gap-2 shrink-0">
      <input type="hidden" name="userId" value={member.user_id} />
      <span className="text-xs text-gray-600">Delete {member.name}?</span>
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        onClick={() => { setConfirming(false); setError(null); }}
        className="px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={pending}
        className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {pending ? "Deleting…" : "Confirm"}
      </button>
    </form>
  );
}
