"use client";

import { useState } from "react";
import { MdLockReset } from "react-icons/md";
import type { OrgMember } from "@/types/organization";

interface Props {
  member: OrgMember;
  resetPassword: (formData: FormData) => Promise<{ url?: string; error?: string }>;
}

export default function ResetPasswordButton({ member, resetPassword }: Props) {
  const [pending, setPending] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    setUrl(null);
    const formData = new FormData();
    formData.set("userId", member.user_id);
    const result = await resetPassword(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else if (result.url) {
      setUrl(result.url);
    }
  }

  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (url) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handleCopy}
          title="Copy reset link"
          className="flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={() => setUrl(null)}
          className="flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-600 text-sm leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        title="Generate password reset link"
        className="flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:bg-amber-50 hover:text-amber-500 transition-colors text-sm leading-none disabled:opacity-50"
        aria-label={`Reset password for ${member.name}`}
      >
        {pending ? "…" : <MdLockReset size={16} />}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
