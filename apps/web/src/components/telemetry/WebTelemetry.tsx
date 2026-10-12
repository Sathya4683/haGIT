"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";

interface TelemetryEvent {
    type: "error" | "vital";
    name: string;
    message?: string;
    route?: string;
    value?: number;
}

const queue: TelemetryEvent[] = [];
const MAX_QUEUE = 20;
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
    timer = null;
    if (queue.length === 0) return;
    const events = queue.splice(0, MAX_QUEUE);
    const payload = JSON.stringify({ source: "web", events });
    try {
        const sent = navigator.sendBeacon?.("/api/telemetry", new Blob([payload], { type: "application/json" }));
        if (!sent) void fetch("/api/telemetry", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    } catch {
        /* telemetry must never break the page */
    }
}

function enqueue(event: TelemetryEvent) {
    if (queue.length >= MAX_QUEUE * 2) return;
    queue.push(event);
    timer ??= setTimeout(flush, 5000);
}

const routeOf = (path: string) => path.replace(/\/\d+(?=\/|$)/g, "/:id");

/** Reports uncaught errors and Core Web Vitals (no personal data, paths only). */
export function WebTelemetry() {
    const pathname = usePathname();

    useReportWebVitals((metric) => {
        if (!["LCP", "INP", "CLS", "FCP", "TTFB"].includes(metric.name)) return;
        const value = metric.name === "CLS" ? Number(metric.value.toFixed(3)) : Math.round(metric.value);
        enqueue({ type: "vital", name: metric.name, value, route: routeOf(window.location.pathname) });
    });

    useEffect(() => {
        const onError = (e: ErrorEvent) => enqueue({ type: "error", name: e.error?.name ?? "Error", message: e.message, route: routeOf(window.location.pathname) });
        const onRejection = (e: PromiseRejectionEvent) => {
            const reason = e.reason as { name?: string; message?: string; response?: unknown } | undefined;
            if (reason?.response) return; // API errors are already logged server-side
            enqueue({ type: "error", name: reason?.name ?? "UnhandledRejection", message: String(reason?.message ?? reason ?? ""), route: routeOf(window.location.pathname) });
        };
        const onHide = () => document.visibilityState === "hidden" && flush();
        window.addEventListener("error", onError);
        window.addEventListener("unhandledrejection", onRejection);
        document.addEventListener("visibilitychange", onHide);
        return () => {
            window.removeEventListener("error", onError);
            window.removeEventListener("unhandledrejection", onRejection);
            document.removeEventListener("visibilitychange", onHide);
        };
    }, []);

    useEffect(() => () => flush(), [pathname]);
    return null;
}
