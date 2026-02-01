"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
            <body>
                <div style={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2rem",
                    fontFamily: "system-ui",
                    textAlign: "center"
                }}>
                    <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
                        Algo salió mal
                    </h1>
                    <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
                        Hemos registrado el error. Por favor, intenta de nuevo.
                    </p>
                    <button
                        onClick={() => window.location.href = "/"}
                        style={{
                            padding: "0.5rem 1rem",
                            background: "#0f172a",
                            color: "white",
                            border: "none",
                            borderRadius: "0.5rem",
                            cursor: "pointer"
                        }}
                    >
                        Volver al inicio
                    </button>
                </div>
            </body>
        </html>
    );
}
