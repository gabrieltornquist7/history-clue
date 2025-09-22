"use client";
import React from "react";

export default function ClueDisplay({ clue }) {
  return (
    <div
      className="max-w-2xl mx-auto rounded-2xl p-6 shadow-lg border relative overflow-hidden
                 transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl"
      style={{
        background: "linear-gradient(180deg,#F6E6CF 0%, #fff 70%)",
        borderColor: "rgba(27,24,17,0.06)",
      }}
    >
      {/* subtle paper texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 10%, rgba(255,255,255,0.05), transparent 8%)",
        }}
      />

      {/* Clue Title */}
      <div
        className="relative inline-block px-3 py-1 rounded-lg font-semibold shadow-sm"
        style={{
          color: "#8B5A2B", // adventure brown
          background: "rgba(255,255,255,0.35)",
        }}
      >
        The Clue
      </div>

      {/* Clue text */}
      <div className="relative mt-4 p-4 rounded-lg bg-white/90 ring-1 ring-inset ring-black/5">
        <p className="text-slate-800 leading-relaxed">{clue}</p>
      </div>

      {/* Action buttons */}
      <div className="relative mt-4 flex gap-3">
        <button
          className="px-4 py-2 rounded-full font-semibold shadow-sm
                     transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#D4A373]"
          style={{ background: "#D4A373", color: "#1F2937" }}
        >
          Inspect
        </button>

        <button
          className="px-4 py-2 rounded-full font-semibold border transition-transform
                     active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#D4A373]"
          style={{
            color: "#8B5A2B",
            borderColor: "rgba(139,90,43,0.2)",
            background: "transparent",
          }}
        >
          Take
        </button>
      </div>
    </div>
  );
}