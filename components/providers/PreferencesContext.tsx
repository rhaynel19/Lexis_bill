"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type AppMode = "simple" | "advanced";
type ProfessionType = "general" | "medic" | "lawyer" | "technical" | "other";

interface UserPreferences {
    mode: AppMode;
    profession: ProfessionType;
    showTips: boolean;
    isOnboarded: boolean;
}

interface PreferencesContextType extends UserPreferences {
    setMode: (mode: AppMode) => void;
    setProfession: (profession: ProfessionType) => void;
    toggleTips: () => void;
    completeOnboarding: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<AppMode>("simple");
    const [profession, setProfessionState] = useState<ProfessionType>("general");
    const [showTips, setShowTipsState] = useState(true);
    const [isOnboarded, setIsOnboardedState] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load preferences from local storage
        const storedPrefs = localStorage.getItem("lexis_preferences");
        const storedAppConfig = localStorage.getItem("appConfigured"); // Existing flag check

        if (storedPrefs) {
            const parsed = JSON.parse(storedPrefs);
            setModeState(parsed.mode || "simple");
            setProfessionState(parsed.profession || "general");
            setShowTipsState(parsed.showTips ?? true);
            setIsOnboardedState(parsed.isOnboarded || !!storedAppConfig);
        } else if (storedAppConfig) {
            // Migration for existing users
            setIsOnboardedState(true);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            const prefs: UserPreferences = { mode, profession, showTips, isOnboarded };
            localStorage.setItem("lexis_preferences", JSON.stringify(prefs));
        }
    }, [mode, profession, showTips, isOnboarded, mounted]);

    const setMode = (newMode: AppMode) => setModeState(newMode);
    const setProfession = (newProf: ProfessionType) => setProfessionState(newProf);
    const toggleTips = () => setShowTipsState((prev) => !prev);
    const completeOnboarding = () => {
        setIsOnboardedState(true);
        localStorage.setItem("appConfigured", "true"); // Maintain compatibility
    };

    return (
        <PreferencesContext.Provider
            value={{
                mode,
                profession,
                showTips,
                isOnboarded,
                setMode,
                setProfession,
                toggleTips,
                completeOnboarding,
            }}
        >
            {children}
        </PreferencesContext.Provider>
    );
}

export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (context === undefined) {
        throw new Error("usePreferences must be used within a PreferencesProvider");
    }
    return context;
}
