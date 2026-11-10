"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PACKS, priceLabel } from "@/lib/packs";

type Me = { user: { email: string } | null; credits?: number };
type Config = { stripe: boolean; paypalClientId: string | null; paypalEnv: string };
type Notice = { kind: "ok" | "error"; text: string } | null;

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: Record<string, unknown>) => { render(el: HTMLElement): Promise<void> };
    };
  }
}

function loadPayPalSdk(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-paypal-sdk]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("paypal sdk failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    s.async = true;
    s.dataset.paypalSdk = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("paypal sdk failed"));
    document.body.appendChild(s);
  });
}

export default function PricingClient() {
  const [me, setMe] = useState<Me | null>(null); // null = 还在加载
  const [config, setConfig] = useState<Config | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busyPack, setBusyPack] = useState("");
  const paypalStarted = useRef(false);
  const containers = useRef<Record<string, HTMLDivElement | null>>({});

  const refreshMe = useCallback(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then(setMe)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshMe();
    fetch("/api/payments/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, [refreshMe]);

  // Stripe 回跳后的兜底入账（主通道是 webhook）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") !== "success") return;
    const sessionId = params.get("session_id") || "";
    window.history.replaceState({}, "", "/pricing");
    if (!sessionId) return;
    fetch(`/api/payments/stripe/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.paid && j.credited) setNotice({ kind: "ok", text: "Payment received — credits added to your account." });
        else if (j.paid) setNotice({ kind: "ok", text: "This payment was already credited." });
        else setNotice({ kind: "error", text: "Payment not confirmed yet — credits will appear once Stripe confirms it." });
        refreshMe();
      })
      .catch(() => setNotice({ kind: "error", text: "Could not verify the payment, refresh in a moment." }));
  }, [refreshMe]);

  const loggedIn = Boolean(me?.user);
  const paypalReady = loggedIn && Boolean(config?.paypalClientId);

  // 登录后挂 PayPal 按钮（每档一个容器）
  useEffect(() => {
    if (!paypalReady || paypalStarted.current) return;
    paypalStarted.current = true;
    const clientId = config?.paypalClientId;
    if (!clientId) return;
    loadPayPalSdk(clientId)
      .then(() => {
        for (const pack of PACKS) {
          const el = containers.current[pack.id];
          if (!el || !window.paypal) continue;
          window.paypal
            .Buttons({
              style: { layout: "vertical", shape: "rect", color: "gold" },
              createOrder: async () => {
                const r = await fetch("/api/payments/paypal/order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ packId: pack.id }),
                });
                const j = await r.json();
                if (!r.ok) throw new Error(j.message || "order failed");
                return j.orderId as string;
              },
              onApprove: async (data: { orderID: string }) => {
                const r = await fetch("/api/payments/paypal/capture", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId: data.orderID }),
                });
                const j = await r.json();
                if (r.ok) {
                  setNotice({ kind: "ok", text: `Payment received — you now have ${j.credits} credits.` });
                  refreshMe();
                } else {
                  setNotice({ kind: "error", text: j.message || "PayPal payment failed." });
                }
              },
              onError: () => setNotice({ kind: "error", text: "PayPal error, please try again." }),
            })
            .render(el)
            .catch(() => setNotice({ kind: "error", text: "Could not render PayPal buttons." }));
        }
      })
      .catch(() => setNotice({ kind: "error", text: "Could not load PayPal." }));
  }, [paypalReady, config, refreshMe]);

  async function buyWithStripe(packId: string) {
    setBusyPack(packId);
    setNotice(null);
    try {
      const r = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const j = await r.json();
      if (r.ok && j.url) {
        window.location.assign(j.url);
        return;
      }
      if (r.status === 401 && j.redirectTo) {
        window.location.assign(j.redirectTo);
        return;
      }
      setNotice({ kind: "error", text: j.message || "Could not start checkout." });
    } catch {
      setNotice({ kind: "error", text: "Network error, please try again." });
    } finally {
      setBusyPack("");
    }
  }

  return (
    <div>
      {loggedIn && typeof me?.credits === "number" && (
        <p className="mb-6 rounded-2xl bg-indigo-50 p-4 text-center text-sm font-semibold text-indigo-700">
          ⚡ You have {me.credits} credit{me.credits === 1 ? "" : "s"}
        </p>
      )}

      {notice && (
        <p
          className={`mb-6 rounded-2xl p-4 text-center text-sm ${
            notice.kind === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </p>
      )}

      {config && !config.stripe && !config.paypalClientId && (
        <p className="mb-6 rounded-2xl bg-amber-50 p-4 text-center text-sm text-amber-800">
          Payment providers are not configured on the server yet — see DEPLOY.md for
          Stripe/PayPal setup.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {PACKS.map((pack) => (
          <div
            key={pack.id}
            className={`rounded-2xl border bg-white p-6 text-center ${
              pack.popular ? "border-indigo-500 shadow-sm ring-2 ring-indigo-100" : "border-neutral-200"
            }`}
          >
            {pack.popular && (
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">
                Most popular
              </p>
            )}
            <h2 className="text-lg font-bold text-neutral-900">{pack.name}</h2>
            <p className="mt-1 text-3xl font-extrabold text-neutral-900">{priceLabel(pack)}</p>
            <p className="mt-1 text-sm text-neutral-600">⚡ {pack.credits} credits</p>
            <p className="mt-1 text-xs text-neutral-400">{pack.tagline}</p>
            <div className="mt-5">
              {me === null ? (
                <div className="h-11 animate-pulse rounded-xl bg-neutral-100" />
              ) : loggedIn ? (
                <>
                  {config?.stripe && (
                    <button
                      onClick={() => buyWithStripe(pack.id)}
                      disabled={busyPack === pack.id}
                      className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busyPack === pack.id ? "Redirecting…" : "Buy with card (Stripe)"}
                    </button>
                  )}
                  {paypalReady && (
                    <div
                      className={config?.stripe ? "mt-2" : ""}
                      ref={(el) => {
                        containers.current[pack.id] = el;
                      }}
                    />
                  )}
                </>
              ) : (
                <>
                  <a
                    href={`/login?next=${encodeURIComponent("/pricing")}`}
                    className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Sign in to buy
                  </a>
                  <p className="mt-2 text-xs text-neutral-400">
                    No account? You still get 2 free renders a day.
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
