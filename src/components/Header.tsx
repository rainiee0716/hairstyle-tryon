"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MeResponse = {
  user: { email: string; name?: string | null; avatarUrl?: string | null } | null;
  credits?: number;
};

export default function Header() {
  const [me, setMe] = useState<MeResponse | null>(null);
  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then(setMe)
      .catch(() => {});
  }, []);

  const user = me?.user ?? null;

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-1.5 font-bold tracking-tight">
          <span aria-hidden>✂️</span>
          <span>Hairstyle Try On</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/pricing" className="text-neutral-600 hover:text-neutral-900">
            Credits
          </Link>
          {user ? (
            <>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                ⚡ {me?.credits ?? 0} credits
              </span>
              {user.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name || user.email}
                  className="h-7 w-7 rounded-full border border-neutral-200"
                />
              )}
              <a href="/api/auth/logout" className="text-neutral-500 hover:text-neutral-900">
                Sign out
              </a>
            </>
          ) : (
            <a
              href="/login"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
