import type { Metadata } from "next";
import TryOnTool from "@/components/TryOnTool";

export const metadata: Metadata = {
  title: "Hairstyle Changer — Change Your Hairstyle on Any Photo",
  description:
    "Change your hairstyle on a photo with AI. Upload a picture, pick a new haircut, and see the new you instantly — free hairstyle changer, works on your phone.",
};

export default function HairstyleChanger() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <section className="text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl">
          Hairstyle Changer — swap your haircut on any photo
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-neutral-600 sm:text-lg">
          Upload a picture, choose from popular haircuts, and our AI changes your hairstyle in
          seconds — keeping your face, lighting and background intact.
        </p>
      </section>
      <section className="mt-8">
        <TryOnTool />
      </section>
      <section className="mt-14">
        <h2 className="text-2xl font-bold">Change hairstyles, skip the guesswork</h2>
        <div className="mt-4 space-y-3 text-neutral-700">
          <p>
            Wondering whether a buzz cut, a bob or long waves would look right on you? Instead of
            imagining it, change your hairstyle on a real photo of yourself and judge with your own
            eyes. It takes less than a minute: upload, tap a style, compare.
          </p>
          <p>
            Because the AI keeps your face, lighting and pose exactly the same, what you see is
            what you would actually look like — not a generic model on a hairstyle chart.
          </p>
        </div>
      </section>
    </main>
  );
}
