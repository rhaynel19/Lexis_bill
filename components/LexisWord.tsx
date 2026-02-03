"use client";

/**
 * Palabra "LEXIS" con estilo elegante: dorado, serif, flourish debajo.
 * Réplica del logo de la marca.
 */
export function LexisWord({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-block font-serif font-bold uppercase tracking-tight text-lexis-gold ${className}`}>
      <span className="relative z-10">
        <span className="text-[1.05em]">L</span>EXIS
      </span>
      {/* Flourish: curva elegante desde la L, bajo EXIS */}
      <svg
        className="absolute -bottom-0.5 left-0 w-full min-w-[4em] h-3"
        viewBox="0 0 120 14"
        preserveAspectRatio="xMidYMax meet"
        aria-hidden
      >
        <path
          d="M 4 12 Q 25 16 45 8 T 90 10 T 114 8"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
