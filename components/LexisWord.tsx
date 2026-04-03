"use client";

/**
 * Trinalyze Billing Logo
 * Triángulo con nodos y texto TRINALYZE (TRINA en blanco/claro, LYZE en azul)
 */
export function LexisWord({ 
  className = "", 
  showBill = false,
  variant = "auto"
}: { 
  className?: string, 
  showBill?: boolean,
  variant?: "auto" | "light" | "dark"
}) {
  const isLight = variant === "light";
  const isDark = variant === "dark";
  
  const trinaColor = isLight 
    ? "text-white" 
    : isDark 
      ? "text-slate-900" 
      : "text-slate-900 dark:text-white";

  const billColor = isLight 
    ? "text-white/90" 
    : isDark 
      ? "text-slate-800" 
      : "text-slate-800 dark:text-gray-100";

  return (
    <span className={`inline-flex items-center font-sans font-bold uppercase tracking-widest ${className}`}>
      {/* Triangle Motif */}
      <svg
        className="w-8 h-8 flex-shrink-0 mr-2 drop-shadow-md"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="lexisGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C79A30" />
            <stop offset="100%" stopColor="#DEB23E" />
          </linearGradient>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Main Triangle Shadow/Outer */}
        <polygon 
            points="50,15 15,85 85,85" 
            stroke="url(#lexisGoldGrad)" 
            strokeWidth="8" 
            fill="none" 
            strokeLinejoin="round" 
            filter="url(#goldGlow)"
        />
        
        {/* Nodes */}
        <circle cx="50" cy="15" r="10" fill="url(#lexisGoldGrad)" />
        <circle cx="15" cy="85" r="10" fill={isLight ? "#FFFFFF" : isDark ? "#0F172A" : "currentColor"} className={variant === "auto" ? "text-slate-900 dark:text-white" : ""} />
        <circle cx="85" cy="85" r="10" fill={isLight ? "#FFFFFF" : isDark ? "#0F172A" : "currentColor"} className={variant === "auto" ? "text-slate-900 dark:text-white" : ""} />
      </svg>
      
      {/* Text TRINALYZE */}
      <span className="text-xl tracking-[0.18em] flex items-center font-black">
        <span className={`${trinaColor} transition-colors`}>TRINA</span>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C79A30] to-[#DEB23E] ml-0.5">LYZE</span>
        {showBill && (
          <span className={`${billColor} ml-2 font-medium opacity-80`}>BILL</span>
        )}
      </span>
    </span>
  );
}
