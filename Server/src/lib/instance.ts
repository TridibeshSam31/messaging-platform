// Phase 9 — which server instance is this?
//
// With WS-1 and WS-2 running, every log line and metric must say which instance
// produced it, otherwise "activeConnections: 40" is meaningless.
//
// INSTANCE_ID=ws-1 in the env gives a readable name; otherwise a short random id
// (a new one on every restart — fine, a restarted process IS a new instance).

import { randomUUID } from "crypto"

export const instanceId = process.env.INSTANCE_ID || randomUUID().slice(0, 8)

// when this process started — /metrics and /health show uptime from it
export const startedAt = Date.now()
