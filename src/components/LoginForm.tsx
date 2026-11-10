"use client";

import { useSearchParams } from "next/navigation";

const ERROR_TEXT: Record<string, string> = {
  state: "Sign-in session expired or mismatched. Please try again.",
  config: "Google login is not configured on the server yet.",
  token: "Could not complete Google sign-in. Please try again.",
  idtoken: "Google returned an unexpected response. Please try again.",
  unverified: "Your Google email is not verified, so we can't sign you in.",
};

function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export default function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const error = params.get("error");

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {ERROR_TEXT[error] ?? "Sign-in failed. Please try again."}
        </p>
      )}
      <a
        href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-neutral-300 bg-white px-6 py-3.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path
            fill="#EA4335"
            d="M12 5.04c1.7 0 3.14.6 4.3 1.7l3.2-3.2C17.55 1.7 15.0 0.7 12 0.7 7.3 0.7 3.3 3.4 1.4 7.3l3.75 2.9C6.05 7.4 8.8 5.04 12 5.04z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.27c0-.86-.08-1.69-.22-2.48H12v4.7h6.46c-.28 1.48-1.13 2.73-2.4 3.57l3.64 2.82c2.13-1.97 3.8-4.86 3.8-8.61z"
          />
          <path
            fill="#FBBC05"
            d="M5.16 14.24a7.2 7.2 0 0 1 0-4.48L1.4 6.86a11.3 11.3 0 0 0 0 10.28l3.76-2.9z"
          />
          <path
            fill="#34A853"
            d="M12 23.3c3.04 0 5.6-1 7.46-2.73l-3.64-2.82c-1.02.68-2.32 1.08-3.82 1.08-3.2 0-5.95-2.36-6.85-5.16l-3.75 2.9C3.3 20.6 7.3 23.3 12 23.3z"
          />
        </svg>
        Continue with Google
      </a>
    </div>
  );
}
