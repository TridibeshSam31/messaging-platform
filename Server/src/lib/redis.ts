// Phase 3 — Redis connection module
//
// Why TWO connections? Once a Redis connection calls SUBSCRIBE it enters
// "subscriber mode" and can't run normal commands like PUBLISH anymore.
// So one connection only publishes, the other only listens.
//
// REDIS_URL not set → both are null and the app runs single-server like before.

import { Redis } from "ioredis"
import { log } from "./logger.js"
import { metrics } from "./metrics.js"
// load .env HERE: imports run before the dotenv.config() line in src/index.ts,
// so without this REDIS_URL would still be undefined when this file runs
import "dotenv/config"

const REDIS_URL = process.env.REDIS_URL

function createConnection(name: string, enableOfflineQueue: boolean) {
    const connection = new Redis(REDIS_URL!, {
        // offline queue = "Redis is down, hold commands until it's back"
        // publisher: OFF, fail immediately so publishEvent() can fall back to local delivery
        // subscriber: ON, so subscribe() at startup waits for the connection
        // (ioredis also re-subscribes automatically after a reconnect)
        enableOfflineQueue,
    })

    // without an "error" listener, a Redis outage would crash the whole Node process
    connection.on("error", (error) => {
        metrics.redis.connectionErrorsTotal.increment() // Phase 9: counted, not just logged
        log.error("redis.error", { connection: name, error: error.message })
    })

    connection.on("ready", () => {
        log.info("redis.ready", { connection: name })
    })

    // ioredis reconnects automatically after a drop; this is just for visibility
    connection.on("reconnecting", () => {
        log.warn("redis.reconnecting", { connection: name })
    })

    return connection
}

export const redisPublisher = REDIS_URL ? createConnection("publisher", false) : null

export const redisSubscriber = REDIS_URL ? createConnection("subscriber", true) : null
