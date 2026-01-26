"use client";

import { Lightbulb, X } from "lucide-react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface SuggestionWidgetProps {
    message: string | null;
    type?: "warning" | "info";
}

export function SuggestionWidget({ message, type = "info" }: SuggestionWidgetProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setVisible(true);
            // Auto-dismiss after 10s if it's just info
            if (type === "info") {
                const timer = setTimeout(() => setVisible(false), 10000);
                return () => clearTimeout(timer);
            }
        } else {
            setVisible(false);
        }
    }, [message, type]);

    if (!message) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={`fixed bottom-24 right-6 md:right-10 z-50 max-w-sm p-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-start gap-3 ${type === "warning"
                            ? "bg-amber-50/90 border-amber-200 text-amber-900"
                            : "bg-blue-50/90 border-blue-200 text-blue-900"
                        }`}
                >
                    <div className={`p-2 rounded-full shrink-0 ${type === "warning" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                        <Lightbulb className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sm mb-1">{type === "warning" ? "Sugerencia" : "Consejo"}</h4>
                        <p className="text-xs leading-relaxed opacity-90">{message}</p>
                    </div>
                    <button onClick={() => setVisible(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
