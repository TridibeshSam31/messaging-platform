// Phase 4 — Shared presence across server instances
//
// Problem: onlineUsers (socket/index.ts) only knows THIS instance's sockets.
// Laptop on WS-1 + phone on WS-2 → closing the laptop makes WS-1 see "0 sockets"
// and mark the user OFFLINE, although the phone is still connected.
//
// Fix: keep one Redis SET per user holding the connectionIds of ALL their sockets,
// on every instance:   presence:<userId>  →  { "conn-a", "conn-b" }
// The user is online while that set is not empty.
//
// Why a SET and not a counter (INCR/DECR)? Removing the same connectionId twice
// is harmless with a set, but decrementing a counter twice would go wrong —
// same "safe to run twice" idea as the Phase 1 disconnect cleanup.

import { redisPublisher } from "./redis.js"
import { onlineUsers } from "../socket/index.js"
import { log } from "./logger.js"

const key = (userId: string) => `presence:${userId}`

// fallback when Redis isn't configured or is down: count this instance's sockets only
// (that's exactly the single-server behaviour from before Phase 4)
const localCount = (userId: string) => onlineUsers.get(userId)?.size ?? 0

// Add a connection, return how many connections the user now has in total.
export async function addPresence(userId: string, connectionId: string): Promise<number> {
    if (!redisPublisher) return localCount(userId)

    try {
        // MULTI = run both commands as one atomic step, so two instances connecting
        // at the same moment can't both read a stale count
        const results = await redisPublisher
            .multi()
            .sadd(key(userId), connectionId) // add to the set
            .scard(key(userId))              // SCARD = size of the set
            .exec()

        // exec() returns [[error, result], [error, result]] — we want SCARD's result
        return Number(results?.[1]?.[1] ?? 0)
    } catch (error) {
        log.error("presence.add.failed", { userId, error: String(error) })
        return localCount(userId)
    }
}

// Remove a connection, return how many connections the user still has in total.
export async function removePresence(userId: string, connectionId: string): Promise<number> {
    if (!redisPublisher) return localCount(userId)

    try {
        const results = await redisPublisher
            .multi()
            .srem(key(userId), connectionId) // remove from the set (no-op if already gone)
            .scard(key(userId))
            .exec()

        return Number(results?.[1]?.[1] ?? 0)
    } catch (error) {
        log.error("presence.remove.failed", { userId, error: String(error) })
        return localCount(userId)
    }
}

// Just read the total (used to re-check after slow DB calls).
export async function getPresenceCount(userId: string): Promise<number> {
    if (!redisPublisher) return localCount(userId)

    try {
        return await redisPublisher.scard(key(userId))
    } catch {
        return localCount(userId)
    }
}
