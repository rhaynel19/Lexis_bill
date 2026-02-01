"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import styles from "./global-error.module.css";

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
                <div className={styles.container}>
                    <h1 className={styles.title}>
                        Algo salió mal
                    </h1>
                    <p className={styles.message}>
                        Hemos registrado el error. Por favor, intenta de nuevo.
                    </p>
                    <button
                        className={styles.button}
                        onClick={() => window.location.href = "/"}
                        type="button"
                    >
                        Volver al inicio
                    </button>
                </div>
            </body>
        </html>
    );
}
