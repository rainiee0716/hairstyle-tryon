import TryOnTool from "@/components/TryOnTool";

const FAQS = [
  {
    q: "Is this hairstyle try on free?",
    a: "Yes — you get 2 free try-ons every day, no sign-up needed. More renders can be unlocked anytime with credit packs (1 credit = 1 render) on the Credits page.",
  },
  {
    q: "How does it work?",
    a: "Upload a front-facing photo, pick a hairstyle, and our AI repaints your hair in seconds while keeping your face and the background unchanged. Drag the slider to compare before and after.",
  },
  {
    q: "Is my photo safe?",
    a: "Your photo is sent only to generate your new hairstyle and is not stored on our servers or used for anything else.",
  },
  {
    q: "Will it work on my phone?",
    a: "Yes. The tool is built mobile-first — take a selfie or upload from your gallery and see your new look right on your screen.",
  },
  {
    q: "Which hairstyles can I try on?",
    a: "Popular men's styles (textured crop, side part, curtains, buzz cut, slick back, man bun) and women's styles (long wavy, bob, curtain bangs, beach waves, pixie, updo). More styles are added regularly.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
          Hairstyle Try On —{" "}
          <span className="text-indigo-600">see your new look before you cut</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-neutral-600 sm:text-lg">
          Upload a photo, pick a hairstyle, and our AI shows you wearing it in seconds.
          Free, no sign-up, works on your phone.
        </p>
      </section>

      {/* 工具 */}
      <section className="mt-8">
        <TryOnTool />
      </section>

      {/* How it works */}
      <section className="mt-14">
        <h2 className="text-center text-2xl font-bold">How the hairstyle try on works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ["1 · Upload", "Take a selfie or upload any front-facing photo with good lighting."],
            ["2 · Choose", "Pick from popular men's and women's hairstyles — crop, bob, waves and more."],
            ["3 · Compare", "Our AI paints the new hairstyle on your photo. Slide to compare, download, decide."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="font-bold text-indigo-600">{t}</p>
              <p className="mt-2 text-sm text-neutral-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold">Why try on hairstyles before cutting?</h2>
        <div className="mt-4 space-y-3 text-neutral-700">
          <p>
            A bad haircut takes weeks to grow out. With a free hairstyle try on you can see
            yourself in a buzz cut, a bob or long waves <strong>before</strong> the scissors touch
            your head — no more guessing, no more regrets.
          </p>
          <p>
            It works for every scenario: trying a bold change, checking if curtain bangs suit your
            face shape, previewing a wedding updo, or just having fun with a new look on your phone.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold">Frequently asked questions</h2>
        <div className="mt-4 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
          {FAQS.map((f) => (
            <details key={f.q} className="group p-4">
              <summary className="cursor-pointer list-none font-semibold text-neutral-800 marker:hidden">
                {f.q}
              </summary>
              <p className="mt-2 text-sm text-neutral-600">{f.a}</p>
            </details>
          ))}
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />
      </section>
    </main>
  );
}
