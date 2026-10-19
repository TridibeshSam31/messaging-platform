import { create } from "zustand"

// Mirrors the WebSocket singleton (src/socket/index.ts) so React can re-render on changes.
//   connecting   → first attempt in progress
//   connected    → socket is open
//   reconnecting → connection dropped, a retry is scheduled (show a banner)
//   disconnected → closed on purpose (logout)
export type SocketStatus = "connecting" | "connected" | "reconnecting" | "disconnected"

type SocketStore = {
  status: SocketStatus
  // kept as a shortcut because ChatPage rejoins rooms when this flips to true
  connected: boolean
  setStatus: (status: SocketStatus) => void
}

export const useSocketStore = create<SocketStore>((set) => ({
  status: "disconnected",
  connected: false,
  // one setter updates both fields, so they can never disagree
  setStatus: (status) => set({ status, connected: status === "connected" }),
}))
