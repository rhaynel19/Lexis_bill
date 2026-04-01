"use client";

/**
 * Trinalyze Billing Logo
 * Triángulo con nodos y texto TRINALYZE (TRINA en blanco/claro, LYZE en azul)
 */
export function LexisWord({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-sans font-bold uppercase tracking-widest ${className}`}>
      {/* Triangle Motif */}
      <svg
        className="w-8 h-8 flex-shrink-0"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="trinalyzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0072FF" />
            <stop offset="100%" stopColor="#00C6FF" />
          </linearGradient>
        </defs>
        {/* Lines */}
        <polygon points="50,15 15,85 85,85" stroke="url(#trinalyzeGrad)" strokeWidth="8" fill="none" strokeLinejoin="round" />
        <polygon points="50,25 25,75 75,75" stroke="#0072FF" strokeWidth="2" fill="none" strokeLinejoin="miter" />
        {/* Nodes */}
        <circle cx="50" cy="15" r="10" fill="url(#trinalyzeGrad)" />
        <circle cx="15" cy="85" r="10" fill="#FFFFFF" />
        <circle cx="85" cy="85" r="10" fill="#FFFFFF" />
      </svg>
      
      {/* Text TRINALYZE */}
      <span className="text-xl tracking-[0.15em] flex items-center">
        <span className="text-white dark:text-white group-hover:text-gray-200 transition-colors">TRINA</span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0072FF] to-[#00C6FF]">LYZE</span>
      </span>
    </span>
  );
}
