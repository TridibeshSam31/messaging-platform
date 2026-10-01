import { AsyncLocalStorage } from "async_hooks"

interface TraceContext {
    traceId: string
}

export const traceContext = new AsyncLocalStorage<TraceContext>()

export function runWithTrace<T>(
    traceId: string,
    callback: () => T
): T {
    return traceContext.run({ traceId }, callback)
}

export function getTraceId(): string | undefined {
    return traceContext.getStore()?.traceId
}