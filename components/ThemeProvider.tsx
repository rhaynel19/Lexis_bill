"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "midnight" | "luxury" | "system";
/** Tema efectivo aplicado al DOM (cuando system prefiere oscuro usamos "dark") */
type AppliedTheme = "light" | "dark" | "midnight" | "luxury";

interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}

interface ThemeProviderState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "lexis-theme",
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== "undefined") {
            const savedTheme = localStorage.getItem(storageKey) as Theme;
            return savedTheme || defaultTheme;
        }
        return defaultTheme;
    });

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove old theme classes and attributes
        root.classList.remove("light", "dark", "midnight", "luxury");
        root.removeAttribute("data-theme");

        let themeToApply: AppliedTheme;
        if (theme === "system") {
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            themeToApply = isDark ? "dark" : "light";
        } else {
            themeToApply = theme;
        }

        // Apply theme as class and data-theme attribute
        root.classList.add(themeToApply);
        root.setAttribute("data-theme", themeToApply);

        // Map all dark themes to 'dark' class for tailwind 'dark:' utility support
        if (themeToApply === "dark" || themeToApply === "midnight" || themeToApply === "luxury") {
            root.classList.add("dark");
        }
    }, [theme]);

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme);
            setTheme(theme);
        },
    };

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};
