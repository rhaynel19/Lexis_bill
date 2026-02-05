"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { AIService } from "@/lib/ai-service-mock";
import { usePreferences } from "@/components/providers/PreferencesContext";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AIInsightWidgetProps {
    revenue: number;
    pendingCount: number;
    /** Ingresos del mes anterior */
    previousRevenue?: number;
    /** Alertas predictivas (NCF, pendientes, etc.) */
    predictions?: string[];
    /** Si el perfil fiscal y al menos un lote NCF están listos */
    configComplete?: boolean;
    /** Nombre del usuario para personalizar el saludo */
    userName?: string;
}

export function AIInsightWidget({
    revenue,
    pendingCount,
    previousRevenue,
    predictions = [],
    configComplete = true,
    userName = ""
}: AIInsightWidgetProps) {
    const { profession, mode } = usePreferences();
    const [insight, setInsight] = useState("");
    const [task, setTask] = useState<{ task: string, urgency: string } | null>(null);

    useEffect(() => {
        const prevRev = previousRevenue !== undefined ? previousRevenue : revenue * 0.8;
        const text = AIService.generateMonthlyInsight(revenue, prevRev, pendingCount, profession, {
            userName,
            configComplete,
            predictions
        });
        setInsight(text);

        const currentDay = new Date().getDate();
        setTask(AIService.predictNextTaxTask(currentDay));
    }, [revenue, previousRevenue, pendingCount, profession, configComplete, userName, predictions]);

    return (
        <Card className="border-none bg-gradient-to-r from-violet-600/10 to-indigo-600/10 shadow-sm mb-6 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-indigo-500"></div>
            <CardContent className="p-4 flex gap-4 items-start">
                <div className="mt-1 bg-white p-2 rounded-full shadow-sm text-violet-600 shrink-0 animate-pulse">
                    <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-2 flex-1">
                    <div>
                        <h4 className="font-bold text-violet-900 text-sm uppercase tracking-wider">Asistente Inteligente</h4>
                        <p className="text-slate-700 leading-relaxed font-medium">
                            "{insight}"
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {task && task.urgency !== "low" && mode !== 'simple' && (
                            <div className={cn("text-xs font-bold px-2 py-1 rounded inline-flex items-center",
                                task.urgency === 'high' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                            )}>
                                ⚡ {task.task}
                            </div>
                        )}
                        {(predictions || []).map((pred, i) => (
                            <div key={i} className="text-xs font-bold px-2 py-1 rounded inline-flex items-center bg-indigo-100 text-indigo-700">
                                🔮 {pred}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
