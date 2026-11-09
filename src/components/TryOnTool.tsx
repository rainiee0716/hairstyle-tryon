"use client";

import { useRef, useState } from "react";
import BeforeAfter from "./BeforeAfter";

const MALE_STYLES = [
  { id: "textured-crop", label: "Textured Crop" },
  { id: "side-part", label: "Side Part" },
  { id: "curtains", label: "Curtains" },
  { id: "buzz-cut", label: "Buzz Cut" },
  { id: "slick-back", label: "Slick Back" },
  { id: "man-bun", label: "Man Bun" },
];
const FEMALE_STYLES = [
  { id: "long-wavy", label: "Long Wavy" },
  { id: "bob", label: "Bob" },
  { id: "curtain-bangs", label: "Curtain Bangs" },
  { id: "beach-waves", label: "Beach Waves" },
  { id: "pixie", label: "Pixie" },
  { id: "updo", label: "Elegant Updo" },
];

type Phase = "idle" | "rendering" | "done" | "error" | "limit";

export default function TryOnTool() {
  const [photo, setPhoto] = useState<string>("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [style, setStyle] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const styles = gender === "male" ? MALE_STYLES : FEMALE_STYLES;

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      setErrorMsg("Photo is too large. Please use an image under 8MB.");
      setPhase("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
      setResult("");
      setPhase("idle");
    };
    reader.readAsDataURL(f);
  }

  async function render() {
    if (!photo || !style) return;
    setPhase("rendering");
    try {
      const res = await fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photo, style, gender }),
      });
      const j = await res.json();
      if (res.status === 429) {
        setErrorMsg(j.message || "Daily free limit reached.");
        setPhase("limit");
        return;
      }
      if (!res.ok) throw new Error(j.message || "render failed");
      setResult(j.image);
      setPhase("done");
    } catch (e: any) {
      setErrorMsg(e?.message || "Something went wrong. Please try again.");
      setPhase("error");
    }
  }

  function download() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = "new-hairstyle.jpg";
    a.click();
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
      {/* 第一步：上传 */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-neutral-700">1 · Upload your photo</p>
          <label
            className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files?.[0]);
            }}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Your photo" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <>
                <span className="text-4xl">📸</span>
                <span className="mt-2 px-4 text-sm text-neutral-500">
                  Tap to upload a selfie <br /> (front-facing, good light)
                </span>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </label>
        </div>
        {/* 第二步：选发型 */}
        <div>
          <p className="mb-2 text-sm font-semibold text-neutral-700">2 · Pick a hairstyle</p>
          <div className="mb-3 flex gap-2">
            {(["male", "female"] as const).map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGender(g);
                  setStyle("");
                }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium capitalize transition ${
                  gender === g
                    ? "bg-indigo-600 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {g === "male" ? "👨 Men" : "👩 Women"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`rounded-xl border px-2 py-3 text-xs font-medium transition ${
                  style === s.id
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={render}
        disabled={!photo || !style || phase === "rendering"}
        className="mt-6 w-full rounded-2xl bg-indigo-600 px-6 py-4 text-base font-bold text-white transition enabled:hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {phase === "rendering" ? "✨ Rendering your new look…" : "3 · Try It On — Free"}
      </button>
      <p className="mt-2 text-center text-xs text-neutral-400">
        2 free try-ons per day · Your photo is not stored on our servers
      </p>

      {phase === "rendering" && (
        <div className="mt-6 animate-pulse rounded-2xl bg-neutral-100 p-8 text-center text-neutral-500">
          Generating… usually takes 10–20 seconds
        </div>
      )}

      {phase === "done" && result && (
        <div className="mt-6">
          <p className="mb-3 text-center text-sm font-semibold text-neutral-700">
            Drag the slider to compare 👇
          </p>
          <BeforeAfter before={photo} after={result} />
          <div className="mt-4 flex gap-3">
            <button
              onClick={download}
              className="flex-1 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-700"
            >
              ⬇ Download
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              🔄 Try another photo
            </button>
          </div>
        </div>
      )}

      {(phase === "error" || phase === "limit") && (
        <div
          className={`mt-6 rounded-2xl p-4 text-center text-sm ${
            phase === "limit"
              ? "bg-amber-50 text-amber-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {errorMsg}
          {phase === "limit" && (
            <p className="mt-1 text-xs">
              Credit packs are coming soon — for now, come back tomorrow.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
