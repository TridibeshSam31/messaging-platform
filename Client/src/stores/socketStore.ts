import { create } from "zustand"

// Nothing in the codebase reads this yet — it's kept small on purpose so it's
// ready if you want a "Reconnecting..." banner or similar later. The socket
// module (src/socket/index.ts) is the actual source of truth for the WebSocket
// connection itself; this just mirrors its open/closed state reactively.
type SocketStore = {
  connected: boolean
  setConnected: (connected: boolean) => void
}

export const useSocketStore = create<SocketStore>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}))