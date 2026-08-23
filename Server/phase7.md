# Phase 7 — Single HTTP + WebSocket Server

## Goal
Merge the Express HTTP server and the WebSocket server so both run on **one port**, while preserving all existing REST APIs and WebSocket functionality, plus graceful shutdown of both.

**Estimated effort:** ~2–3 hours

---

## 1. The problem with the current architecture

Two independent servers were running on two different ports:

```
Client
  │
  ├── HTTP :3000  → Express Server  → REST APIs (/api/messages, etc.)
  │
  └── WS   :8080  → WebSocket Server (created inside initializeWebSocket())
                    │
                    ▼
                PostgreSQL
```

`initializeWebSocket()` was creating its **own internal HTTP server** on port 8080, completely separate from the Express server bound via `app.listen(PORT)`.

**Why this is bad:**
- Two ports to expose, secure, and load-balance instead of one
- Client has to know about two different origins/ports for HTTP vs WS
- Harder to put behind a single reverse proxy / load balancer later

---

## 2. Key insight: WebSocket starts life as an HTTP request

A WebSocket connection begins as a normal HTTP request with an `Upgrade` header:

```
GET /socket HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
Sec-WebSocket-Version: 13
```

The server replies:

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
```

After the `101` response, the connection is no longer treated as plain HTTP — it "flips" into a WebSocket connection on the **same underlying TCP connection**.

```
HTTP
 │
 │ Upgrade
 ▼
WebSocket
```

This is the reason HTTP and WebSocket can share a single server and port: they both start as HTTP, and only diverge at the `Upgrade` handshake.

---

## 3. Target architecture

```
                    Client
                      │
                    :3000
                      │
              ┌───────▼────────┐
              │  HTTP Server    │
              │                 │
              │ Express         │
              │ WebSocket       │
              └───────┬─────────┘
                      │
              ┌───────┴────────┐
              │                │
          HTTP request      WS upgrade
              │                │
              ▼                ▼
           Express        WebSocket
```

One port. One underlying HTTP server. Two kinds of traffic routed off the same listener.

**Common mistake to avoid:** just changing WS's port to match Express's port (`8080 → 3000`) does **not** work — two separate server processes still can't bind the same port. The fix is architectural (one server object), not just a port number change.

---

## 4. The actual mechanism

`app.listen(PORT)` is really shorthand — under the hood Express does this for you:

```ts
const server = http.createServer(app);
server.listen(PORT);
```

So to share the server with WebSocket, you need explicit access to that `server` object instead of letting `app.listen()` hide it:

```ts
import http from "http";

const server = http.createServer(app);
server.listen(PORT);
```

Then the `ws` library attaches to that **same** HTTP server instead of creating its own:

```ts
const wss = new WebSocketServer({ server });
```

Result:

```
server (http.Server)
  │
  ├── Express   → handles normal HTTP requests
  │
  └── WebSocket → handles Upgrade requests
```

`initializeWebSocket()` now **receives** the shared `server` instead of creating its own internal HTTP server — and it also **returns `wss`**, so `shutdown()` (outside the function) can reach it later.

---

## 5. Why this is better

Before:
```
example.com:3000 → HTTP
example.com:8080 → WebSocket
```

After:
```
example.com:3000 → HTTP + WebSocket
```

Client can now use:
- `https://example.com/api/...` for REST
- `wss://example.com/ws` for WebSocket

...on the **same origin and port**. This also simplifies future scaling: a load balancer only needs to route traffic to a single listener per instance instead of two.

```
                    Load Balancer
                         │
              ┌──────────┴──────────┐
              │                     │
            WS-1                  WS-2
              │                     │
            :3000                 :3000
```

---

## 6. Self-check questions (answer without looking at code)

1. Why can't you just do `app.listen(3000)` and `initializeWebSocket(3000)` separately?
2. What's the actual difference between `app` and `http.createServer(app)`?
3. In `new WebSocketServer({ server })`, what exactly is `wss` attaching itself to?
4. When a request comes in with `Upgrade: websocket`, how does the server know to hand it to WebSocket instead of Express? (Hint: think about where the `101 Switching Protocols` response comes from and who's listening for the `upgrade` event on the HTTP server.)

---

## 7. Interview-readiness checklist

- Why were there two servers in the original architecture?
- Difference between `express()` and `http.createServer(app)`?
- How does WebSocket get established over HTTP?
- Why can HTTP and WebSocket share the same port?
- What does `server.close()` do?
- Why isn't `wss.close()` alone enough to shut everything down?
- Why do we need both `ws.close()` and `ws.terminate()`?
- Why shouldn't a server shutdown trigger a presence DB update for every connected user?
- Why does `initializeWebSocket()` now receive the HTTP server instead of creating one?
- Why did we return `wss` from `initializeWebSocket()`?

---

## 8. Graceful shutdown

Once HTTP + WS share one server, shutting that server down cleanly means coordinating **three** things: the HTTP server, the WebSocket connections, and Prisma — not just calling `process.exit(0)`.

### Why not just `process.exit(0)`?

```
process.exit(0)
      ↓
    💥 immediate
```

- Active WebSocket connections break abruptly
- In-flight HTTP requests get cut off
- DB operations mid-flight may be left incomplete
- No cleanup of in-memory state (`clients`, `rooms`, `onlineUsers`)

### The flow to implement

```
SIGTERM / SIGINT
        ↓
   shutdown()
        ↓
isShuttingDown = true
        ↓
Stop accepting new WS connections
        ↓
ws.close() on every existing client   (ask nicely)
        ↓
wait up to 5s
        ↓
   still open? → ws.terminate()       (force)
        ↓
server.close()                        (stop new HTTP conns, let existing finish)
        ↓
prisma.$disconnect()
        ↓
process.exit(0)
```

### `SIGINT` vs `SIGTERM`

```ts
process.on("SIGINT", shutdown);   // Ctrl+C, mostly seen in dev
process.on("SIGTERM", shutdown);  // sent by process managers / deploys, prod
```

`process` is Node's global object — `process.on(...)` lets you listen for OS-level signals sent to the running process.

### `server.close()` vs `wss.close()` vs `ws.close()` vs `ws.terminate()`

| Call | Scope | Effect |
|---|---|---|
| `server.close()` | HTTP server | Stops accepting **new** HTTP connections; waits for existing ones to finish before firing its callback |
| `wss.close()` | WebSocket server | Stops accepting **new** WebSocket connections — does **not** touch already-connected clients |
| `ws.close()` | One socket | Politely asks a single client to close (starts the WS closing handshake) |
| `ws.terminate()` | One socket | Immediately kills a single socket, no handshake, no waiting |

Because `wss.close()` doesn't clean up existing clients, you have to loop over them yourself:

```ts
for (const ws of clients.keys()) {
  ws.close();
}
```

### Why a timeout + `terminate()` fallback is needed

If a client's network is dead or the tab is frozen, it will never respond to `ws.close()`. Without a timeout, `server.close()`'s callback (and therefore `prisma.$disconnect()` and `process.exit()`) can hang forever waiting for that one connection.

```ts
const forceCloseTimer = setTimeout(() => {
  for (const ws of clients.keys()) {
    ws.terminate();
  }
}, 5000);

server.close(async () => {
  clearTimeout(forceCloseTimer);
  await prisma.$disconnect();
  process.exit(0);
});
```

So the strategy is: **graceful when possible, forceful when necessary**, bounded to a max ~5s shutdown window.

### `isShuttingDown` — why it exists

A normal disconnect and a server-triggered shutdown look the same to a `ws.on("close", ...)` handler unless you tell them apart. But they should **not** be treated the same:

```
WebSocket closes
       │
       ▼
Remove from rooms / clients / onlineUsers   ← always do this
       │
       ▼
  isShuttingDown?
    /        \
  YES         NO
   │           │
   ▼           ▼
 return     DB update: status = OFFLINE, lastSeen, emit user_offline
```

If the server has 50,000 open sockets and shuts down, closing all of them would otherwise fire 50,000 individual "user went offline" DB writes and broadcasts — expensive and pointless, since it's the server going away, not 50,000 people actually logging off.

Passed as a function (`() => isShuttingDown`) rather than a raw boolean, so the WebSocket module always reads the **current** value at close-time instead of capturing a stale `false` from initialization time.

Also guard against the shutdown handler itself running twice (signals can arrive more than once):

```ts
if (isShuttingDown) return;
isShuttingDown = true;
```

### Ordering matters: don't disconnect Prisma too early

```
WebSocket  →  HTTP  →  PostgreSQL  →  exit
```

Close things in dependency order — don't `prisma.$disconnect()` while WebSocket close handlers might still need to write to the DB (e.g. normal, non-shutdown disconnects that happen right before shutdown starts).

### One-sentence interview answer

> "I listen for SIGTERM and SIGINT and run a controlled shutdown: mark the server as shutting down so close handlers skip expensive per-user presence updates, stop accepting new WS connections, request graceful closure of existing sockets with a timeout that force-terminates stragglers, close the HTTP server so in-flight requests can finish, then disconnect Prisma and exit."

---

## 9. Status

**Core implementation: DONE ✅**

- HTTP + WebSocket unified on one port
- `createServer(app)` owns the shared server
- `ws` attached to the existing HTTP server (not a separate one)
- Frontend updated to use `ws://localhost:3000`
- Graceful shutdown wired up (closes WS connections gracefully, force-terminates on timeout, then closes HTTP server, then disconnects Prisma)
- `isShuttingDown` flag separates normal disconnects from server-shutdown-triggered disconnects

**Explicitly out of scope for this phase** (deferred, not to be added yet):
- Production load-balancer shutdown/draining
- Connection draining policies
- Kubernetes termination behavior
- Advanced WebSocket lifecycle management

**Next phase:** Phase 8 — Docker & Distributed Local Environment (running multiple WebSocket instances locally on top of this single-server architecture).

---

## One-line takeaway

> A WebSocket server can attach to an existing Node HTTP server because every WebSocket connection begins life as a plain HTTP `Upgrade` request — so instead of creating a second server, you give `ws` a reference to the same `http.Server` instance Express is already using.