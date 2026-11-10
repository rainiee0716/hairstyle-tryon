import type { Metadata } from "next";
import TryOnTool from "@/components/TryOnTool";

export const metadata: Metadata = {
  title: "Hairstyle Try On App — Try New Haircuts on Your Phone",
  description:
    "No download needed. Hairstyle try on app that runs in your browser: upload a selfie, try haircuts on your own photo, save and share — free on iPhone and Android.",
};

export default function HairstyleTryOnApp() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <section className="text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          Hairstyle Try On App — no download, works on any phone
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-neutral-600 sm:text-lg">
          You don&apos;t need an app store. This hairstyle try on app runs right in your browser —
          upload a selfie, try haircuts on your own photo, save and share for free.
        </p>
      </section>
      <section className="mt-8">
        <TryOnTool />
      </section>
      <section className="mt-14">
        <h2 className="text-2xl font-bold">Why use the web app?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["📱 No install", "Works instantly on iPhone and Android — nothing to download, nothing to update."],
            ["⚡ Fast", "Renders in seconds, right in your mobile browser."],
            ["🔒 Private", "Your selfie is processed for the preview and never stored."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="font-bold text-indigo-600">{t}</p>
              <p className="mt-2 text-sm text-neutral-600">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-neutral-600">
          Tip: add this page to your home screen (Share → Add to Home Screen) and it behaves like a
          native hairstyle try on app.
        </p>
      </section>
    </main>
  );
}
