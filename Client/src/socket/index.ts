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

// Server auth is `?token=` on the connection URL (Server/src/socket/index.ts),
// not a header — WebSocket's constructor can't set headers from the browser
// anyway, so this is the only option that matches the server's expectations.
export function connectSocket() {
  const token = useAuthStore.getState().accessToken
  if (!token || !WS_URL) return
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }

  socket = new WebSocket(`${WS_URL}/?token=${token}`)

  socket.onopen = () => {
    useSocketStore.getState().setConnected(true)
  }

  socket.onmessage = (event) => {
    let data: IncomingMessage
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }
    listeners.forEach((listener) => listener(data))
  }

  socket.onclose = () => {
    useSocketStore.getState().setConnected(false)
    socket = null
    // No reconnect-with-backoff here on purpose — the server doesn't have
    // heartbeat/ping-pong yet either (see README Roadmap), so a client-side
    // reconnect loop would just be guessing when the server is actually
    // reachable again. Worth adding once the server side exists.
  }

  socket.onerror = () => {
    socket?.close()
  }
}

export function disconnectSocket() {
  socket?.close()
  socket = null
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