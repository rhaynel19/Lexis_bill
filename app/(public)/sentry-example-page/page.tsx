"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import styles from "./page.module.css";

export default function SentryExamplePage() {
    const triggerError = () => {
        const err = new Error("Prueba de Sentry - si ves esto en Sentry Issues, la configuración funciona.");
        const eventId = Sentry.captureException(err);
        console.log("[Sentry] Event ID:", eventId, "DSN configurado:", !!process.env.NEXT_PUBLIC_SENTRY_DSN);
        alert(eventId ? `¡Error enviado! Event ID: ${eventId}\nRevisa Sentry → Issues.` : "No se pudo enviar. ¿Bloqueador de anuncios activo? Desactívalo y reintenta.");
    };

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>Prueba de Sentry</h1>
                <p className={styles.description}>
                    Haz clic en el botón para enviar un error de prueba a Sentry. Abre la consola del navegador (F12) para ver logs.
                </p>
                <button onClick={triggerError} className={styles.button} type="button">
                    Disparar error de prueba
                </button>
                <p className={styles.hint}>
                    Si no llega: desactiva bloqueadores (uBlock, AdBlock, Brave Shields) y recarga.
                </p>
                <Link href="/" className={styles.link}>
                    ← Volver al inicio
                </Link>
            </div>
        </div>
    );
}
