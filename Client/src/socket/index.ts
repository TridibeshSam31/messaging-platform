import { useAuthStore } from "@/stores/authStore"
import { useSocketStore } from "@/stores/socketStore"

// Server/src/socket/index.ts boots its own `ws` server on a separate port
// (8080) from the REST API — see the README's "System Overview" note — so
// this needs its own base URL, not something derived from VITE_API_URL.
// Add VITE_WS_URL to Client/.env, e.g. VITE_WS_URL=ws://localhost:8080
const WS_URL = import.meta.env.VITE_WS_URL as string

type IncomingMessage = { type: string; [key: string]: unknown }
type Listener = (msg: IncomingMessage) => void

let socket: WebSocket | null = null
const listeners = new Set<Listener>()

// --- Reconnection state (Phase 1) ---
// how many times in a row we've failed to reconnect; drives the backoff delay
let reconnectAttempts = 0
// the pending setTimeout for the next retry, so we can cancel it on logout
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
// true when WE closed the socket on purpose (logout) — then we must NOT reconnect
let closedOnPurpose = false

const BASE_DELAY_MS = 1000 // first retry after 1s
const MAX_DELAY_MS = 30000 // never wait longer than 30s

// Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s...
// Doubling the wait stops thousands of clients hammering a server that just restarted.
function scheduleReconnect() {
  const delay = Math.min(BASE_DELAY_MS * 2 ** reconnectAttempts, MAX_DELAY_MS)
  reconnectAttempts++
  useSocketStore.getState().setStatus("reconnecting") // UI shows the banner
  reconnectTimer = setTimeout(connectSocket, delay)
}

// Server auth is `?token=` on the connection URL (Server/src/socket/index.ts),
// not a header — WebSocket's constructor can't set headers from the browser
// anyway, so this is the only option that matches the server's expectations.
export function connectSocket() {
  const token = useAuthStore.getState().accessToken
  if (!token || !WS_URL) return
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }

  closedOnPurpose = false
  // only the very first attempt is "connecting"; retries stay "reconnecting"
  if (reconnectAttempts === 0) useSocketStore.getState().setStatus("connecting")

  // keep a local reference so the handlers below know which socket they belong to
  // Phase 9: tell the server this is a RE-connect, so it can count how often clients drop
  const reconnectFlag = reconnectAttempts > 0 ? "&reconnect=1" : ""
  const ws = new WebSocket(`${WS_URL}/?token=${token}${reconnectFlag}`)
  socket = ws

  ws.onopen = () => {
    reconnectAttempts = 0 // success — next failure starts again from 1s
    useSocketStore.getState().setStatus("connected") // ChatPage sees this and rejoins rooms
  }

  ws.onmessage = (event) => {
    let data: IncomingMessage
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }
    listeners.forEach((listener) => listener(data))
  }

  ws.onclose = () => {
    // an old socket finished closing after a newer one was created — ignore it
    if (socket !== ws) return

    socket = null

    // logout → stay disconnected. Anything else (server restart, heartbeat
    // terminate, wifi drop) → try again after a backoff delay.
    if (!closedOnPurpose) scheduleReconnect()
  }

  ws.onerror = () => {
    ws.close() // onclose runs next and handles the reconnect
  }
}

export function disconnectSocket() {
  closedOnPurpose = true
  // cancel a retry that might be waiting, otherwise we'd reconnect after logout
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
  reconnectAttempts = 0
  socket?.close()
  socket = null
  useSocketStore.getState().setStatus("disconnected")
}

export function sendWS(payload: Record<string, unknown>) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn("[ws] not connected, dropped:", payload)
    return
  }
  socket.send(JSON.stringify(payload))
}

// Returns an unsubscribe function, so callers (useSocketEvents) can clean up
// in a useEffect return without holding onto the listener reference.
export function onWSMessage(listener: Listener) {
  listeners.add(listener)
  // Explicit void return — a React effect cleanup function must return void,
  // and Set#delete() returns boolean, which TS effect typing rejects.
  return () => {
    listeners.delete(listener)
  }
}

export function joinRoom(roomId: string) {
  sendWS({ type: "join_room", roomId })
}

export function leaveRoom(roomId: string) {
  sendWS({ type: "leave_room", roomId })
}