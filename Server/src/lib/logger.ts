import { getTraceId } from "./tracing.js";
import { instanceId } from "./instance.js";

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogData {
    [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
    "password",
    "passwordHash",
    "accessToken",
    "refreshToken",
    "token",
    "authorization",
    "cookie",
    "set-cookie",
    "apiKey",
    "secret",
]);

function sanitize(data: unknown): unknown {
    if (Array.isArray(data)) {
        return data.map(sanitize);
    }

    if (data && typeof data === "object") {
        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(data)) {
            if (SENSITIVE_KEYS.has(key.toLowerCase())) {
                result[key] = "[REDACTED]";
                continue;
            }

            result[key] = sanitize(value);
        }

        return result;
    }

    return data;
}

function writeLog(
    level: LogLevel,
    event: string,
    data: LogData = {}
) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        service: "messaging-server",
        environment: process.env.NODE_ENV || "development",
        // Phase 9: which server wrote this line (WS-1 or WS-2?)
        instanceId,
        // Phase 9: id of the HTTP request / WebSocket message being handled right now.
        // Comes from AsyncLocalStorage (lib/tracing.ts), so NO function has to pass it
        // around — filter logs by one traceId to see everything that request did.
        traceId: getTraceId(),
        event,
        ...sanitize(data) as Record<string, unknown>,
    };

    const output = JSON.stringify(entry);

    if (level === "error" || level === "fatal") {
        console.error(output);
        return;
    }

    console.log(output);
}

export const log = {
    debug: (event: string, data: LogData = {}) =>
        writeLog("debug", event, data),

    info: (event: string, data: LogData = {}) =>
        writeLog("info", event, data),

    warn: (event: string, data: LogData = {}) =>
        writeLog("warn", event, data),

    error: (event: string, data: LogData = {}) =>
        writeLog("error", event, data),

    fatal: (event: string, data: LogData = {}) =>
        writeLog("fatal", event, data),
};