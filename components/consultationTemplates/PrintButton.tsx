"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print fixed right-6 top-6 z-50 flex items-center gap-2 rounded-full bg-[#0a0e17] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
      </svg>
      Save as PDF
    </button>
  );
}
