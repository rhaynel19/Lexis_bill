"use client";

/**
 * Trinalyze Billing Logo
 * Triángulo con nodos y texto TRINALYZE (TRINA en blanco/claro, LYZE en azul)
 */
export function LexisWord({ className = "", showBill = false }: { className?: string, showBill?: boolean }) {
  return (
    <span className={`inline-flex items-center font-sans font-bold uppercase tracking-widest ${className}`}>
      {/* Triangle Motif */}
      <svg
        className="w-8 h-8 flex-shrink-0 mr-2"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="trinalyzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C79A30" />
            <stop offset="100%" stopColor="#DEB23E" />
          </linearGradient>
        </defs>
        {/* Lines */}
        <polygon points="50,15 15,85 85,85" stroke="url(#trinalyzeGrad)" strokeWidth="8" fill="none" strokeLinejoin="round" />
        <polygon points="50,25 25,75 75,75" stroke="#C79A30" strokeWidth="2" fill="none" strokeLinejoin="miter" />
        {/* Nodes */}
        <circle cx="50" cy="15" r="10" fill="url(#trinalyzeGrad)" />
        <circle cx="15" cy="85" r="10" fill="#FFFFFF" />
        <circle cx="85" cy="85" r="10" fill="#FFFFFF" />
      </svg>
      
      {/* Text TRINALYZE */}
      <span className="text-xl tracking-[0.15em] flex items-center">
        <span className="text-[#1F2937] drop-shadow-[0_0_2px_rgba(255,255,255,0.9)] dark:text-white dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] transition-colors">TRINA</span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C79A30] to-[#DEB23E] drop-shadow-sm">LYZE</span>
        {showBill && (
          <span className="text-[#111827] ml-2 drop-shadow-[0_0_2px_rgba(255,255,255,0.9)] dark:text-gray-100 dark:drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] transition-colors">BILL</span>
        )}
      </span>
    </span>
  );
}
