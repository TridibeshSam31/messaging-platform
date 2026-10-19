// Phase 1 — Heartbeat (ping / pong)
//
// Problem: if a user's wifi drops or laptop sleeps, the TCP connection can die
// silently — no "close" event ever fires, so the socket stays in our maps forever
// and the user looks ONLINE forever.
//
// Fix: every few seconds the server sends a "ping". A healthy client answers with
// a "pong" automatically (browsers do this for us, no frontend code needed).
// If a socket hasn't answered for too long, we treat it as dead and kill it.

import { WebSocketServer } from "ws"
import { clients } from "./index.js"
import { log } from "../lib/logger.js"

// how often we send a ping (30 seconds)
const HEARTBEAT_INTERVAL_MS = 30_000

// if no pong for this long, the socket is dead (2 missed pings)
const HEARTBEAT_TIMEOUT_MS = HEARTBEAT_INTERVAL_MS * 2

export function startHeartbeat(wss: WebSocketServer) {

    const interval = setInterval(() => {

        const now = Date.now()

        for (const [ws, client] of clients) {

            // how long since this socket last answered?
            const silentFor = now - client.lastPongAt

            if (silentFor > HEARTBEAT_TIMEOUT_MS) {
                log.warn("ws.heartbeat.dead", {
                    userId: client.userId,
                    connectionId: client.connectionId,
                    silentForMs: silentFor,
                })

                // terminate() = kill instantly (close() would wait for a reply that never comes)
                // this fires the "close" event, so the existing cleanup in index.ts runs
                ws.terminate()
                continue
            }

            // still alive — ask again
            ws.ping()
        }

    }, HEARTBEAT_INTERVAL_MS)

    // when the server shuts down, stop the timer
    wss.on("close", () => {
        clearInterval(interval)
    })
}
