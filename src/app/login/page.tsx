import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-4xl" aria-hidden>
          ✂️
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-neutral-600">
          One click with Google — no password. Signing in keeps your usage on our
          servers (not in a browser cookie) and lets you buy credit packs.
        </p>
        <div className="mt-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-4 text-xs text-neutral-400">
          You can keep using the tool without an account — 2 free try-ons a day.
        </p>
      </div>
    </main>
  );
}
