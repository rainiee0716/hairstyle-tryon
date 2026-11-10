import type { Metadata } from "next";
import PricingClient from "@/components/PricingClient";

export const metadata: Metadata = {
  title: "Credit packs",
  description:
    "Buy Hairstyle Try On credit packs — 1 credit per AI hairstyle render. Secure checkout via Stripe and PayPal.",
};

export default function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <section className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Credit packs —{" "}
          <span className="text-indigo-600">more looks, zero waiting</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-neutral-600 sm:text-lg">
          Everyone gets 2 free renders a day. Need more right now? Grab credits —
          1 credit = 1 render, credits never expire.
        </p>
      </section>

      <section className="mt-8">
        <PricingClient />
      </section>

      <section className="mt-12 rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
        <h2 className="font-bold text-neutral-800">Good to know</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>1 credit = 1 hairstyle render. Your 2 daily free renders stay free.</li>
          <li>Credits are tied to your account and never expire.</li>
          <li>Payments are processed by Stripe and PayPal — we never see or store your card details.</li>
          <li>Photos used for renders are not stored on our servers.</li>
        </ul>
      </section>
    </main>
  );
}
