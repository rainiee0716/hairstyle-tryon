"use client";

import { useRef, useState, useCallback } from "react";

// Before/After 对比滑块：拖动中间分割线查看发型前后对比
export default function BeforeAfter({
  before,
  after,
}: {
  before: string;
  after: string;
}) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = useCallback((clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const p = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(p);
  }, []);

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 select-none"
      style={{ aspectRatio: "3 / 4" }}
      onPointerDown={(e) => {
        dragging.current = true;
        move(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging.current) move(e.clientX);
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => (dragging.current = false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt="After hairstyle" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={before}
          alt="Original photo"
          className="h-full w-full object-cover"
          style={{ width: ref.current?.clientWidth ? `${ref.current.clientWidth}px` : "100%", maxWidth: "none" }}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md cursor-ew-resize"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white shadow-lg flex items-center justify-center text-neutral-600 text-sm font-bold">
          ↔
        </div>
      </div>
      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">Before</span>
      <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">After</span>
    </div>
  );
}
