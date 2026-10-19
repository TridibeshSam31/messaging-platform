// Phase 3 — Realtime event bus (Redis Pub/Sub)
//
// Before: handlers looped over THIS server's rooms map and called socket.send().
//         Users connected to another server instance never got the event.
// Now:    handlers call publishEvent(). Redis hands the event to EVERY instance
//         (including this one), and each instance delivers it to its own sockets.
//
// PostgreSQL is still the source of truth — handlers save first, publish second.
// Redis Pub/Sub stores nothing: an instance that isn't listening misses the event,
// and Phase 2 recovery fetches anything missed from the DB on reconnect.

import { clients, rooms, onlineUsers } from "./index.js"
import { redisPublisher, redisSubscriber } from "../lib/redis.js"
import { log } from "../lib/logger.js"
import { metrics } from "../lib/metrics.js"

// one Redis channel for all realtime events
const CHANNEL = "realtime"

// ---- Typed event contracts ----
// Every event says WHERE it goes (target) and WHAT to send (payload).
// payload is exactly the JSON the browser receives, e.g. { type: "chat", data: {...} }

type RoomEvent = {
    target: "room"
    roomId: string
    // socket objects can't travel through Redis, so we skip the sender by connectionId
    excludeConnectionId?: string
    payload: Record<string, unknown>
}

type UserEvent = {
    target: "user"
    userId: string // delivered to every socket (tab/device) of this user
    payload: Record<string, unknown>
}

export type RealtimeEvent = RoomEvent | UserEvent

// ---- Router: deliver an event to the sockets connected to THIS instance ----
function routeEvent(event: RealtimeEvent) {
    const message = JSON.stringify(event.payload) // stringify once, send to many

    if (event.target === "room") {
        const sockets = rooms.get(event.roomId)
        if (!sockets) return // nobody from this room is connected here — normal

        for (const socket of sockets) {
            if (clients.get(socket)?.connectionId === event.excludeConnectionId) continue
            metrics.websocket.messagesSentTotal.increment()
            socket.send(message)
        }
        return
    }

    // target === "user"
    const sockets = onlineUsers.get(event.userId)
    if (!sockets) return

    for (const socket of sockets) {
        metrics.websocket.messagesSentTotal.increment()
        socket.send(message)
    }
}

// ---- Publisher: handlers call this instead of looping over sockets ----
export async function publishEvent(event: RealtimeEvent) {
    // no Redis configured → single-server mode, deliver locally like before
    if (!redisPublisher) {
        routeEvent(event)
        return
    }

    try {
        await redisPublisher.publish(CHANNEL, JSON.stringify(event))
        // NOT calling routeEvent here: our own subscriber receives this event too,
        // so delivering here as well would send everything twice
    } catch (error) {
        // Redis is down → at least the users on this instance still get it
        log.error("realtime.publish.failed", {
            error: error instanceof Error ? error.message : String(error),
        })
        routeEvent(event)
    }
}

// ---- Subscriber: every instance listens and routes to its local sockets ----
export function startRealtimeSubscriber() {
    if (!redisSubscriber) {
        log.info("realtime.mode", { mode: "local" })
        return
    }

    redisSubscriber.subscribe(CHANNEL).catch((error) => {
        log.error("realtime.subscribe.failed", { error: error.message })
    })

    redisSubscriber.on("message", (channel, raw) => {
        if (channel !== CHANNEL) return
        try {
            routeEvent(JSON.parse(raw) as RealtimeEvent)
        } catch (error) {
            // one bad event must not kill the listener
            log.error("realtime.event.invalid", {
                error: error instanceof Error ? error.message : String(error),
            })
        }
    })

    log.info("realtime.mode", { mode: "redis" })
}
