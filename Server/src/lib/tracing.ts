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

//what is the fxn of async local storage in nodejs
//in simpler terms async local storage is a way to store data that is specific to a particular asynchronous operation or request in Node.js.
//  It allows you to maintain context across different parts of your code, even when dealing with asynchronous operations like callbacks, promises, or async/await.
//  This is useful for things like tracing requests, logging, or managing user sessions, as it helps keep track of information that is relevant to a specific request or operation without interfering with other concurrent operations.