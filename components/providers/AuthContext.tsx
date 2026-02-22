"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    profession?: string;
    rnc?: string;
    role: string;
    subscription?: { plan: string; status: string; [key: string]: unknown };
    fiscalStatus?: { suggested?: string; confirmed?: string };
    partner?: { referralCode: string; status: string; tier?: string } | null;
    onboardingCompleted?: boolean;
    needsPolicyAcceptance?: boolean;
    policiesToAccept?: Array<{ slug: string; version: number; title: string }>;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    setUser: (u: AuthUser | null) => void;
    setLoading: (b: boolean) => void;
    refresh: () => Promise<AuthUser | null>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUserState] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async (): Promise<AuthUser | null> => {
        try {
            const { api } = await import("@/lib/api-service");
            const me = await api.getMe();
            setUserState(me || null);
            return me || null;
        } catch {
            setUserState(null);
            return null;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            const { api } = await import("@/lib/api-service");
            await api.logout();
        } catch {
            // ignore
        }
        setUserState(null);
        if (typeof window !== "undefined") {
            Object.keys(localStorage).forEach((key) => {
                if (key.startsWith("cache_")) localStorage.removeItem(key);
            });
        }
    }, []);

    const setUser = useCallback((u: AuthUser | null) => {
        setUserState(u);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                setUser,
                setLoading,
                refresh,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (ctx === undefined) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
