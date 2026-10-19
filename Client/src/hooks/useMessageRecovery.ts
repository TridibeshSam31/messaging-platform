import { useEffect } from "react"
import { messageApi } from "@/api/message"
import { useAuthStore } from "@/stores/authStore"
import { useChatStore } from "@/stores/chatStore"
import { useSocketStore } from "@/stores/socketStore"
import type { Message } from "@/types"

// Phase 2 — Message Recovery
// While the socket was down, broadcasts never reached us, but the messages are
// still in PostgreSQL. Every time we (re)connect, ask the server for anything
// newer than the last message we already have, per conversation.
export function useMessageRecovery() {
  const connected = useSocketStore((s) => s.connected)

  useEffect(() => {
    if (!connected) return

    // getState() reads the store once, without subscribing — we only need a snapshot here
    const { messages } = useChatStore.getState()

    for (const [convId, list] of Object.entries(messages)) {
      // our "last processed message" = the newest one in the store (list is oldest → newest)
      const last = list[list.length - 1]
      // nothing loaded for this chat yet → it'll load fully when opened, nothing to recover
      if (!last) continue
      recoverConversation(convId, last.id)
    }
  }, [connected])
}

async function recoverConversation(convId: string, lastId: string) {
  const { mergeRecoveredMessages, setMessages, updateLastMessage } = useChatStore.getState()
  const myUserId = useAuthStore.getState().user?.id
  if (!myUserId) return

  try {
    const { messages: missed, hasMore } = await messageApi.getAfter(convId, lastId)

    // missed too many (or server didn't know lastId) → simplest correct thing: reload newest page
    if (hasMore) {
      const page = await messageApi.getPage(convId)
      setMessages(convId, [...page.messages].reverse(), page.nextCursor)
      return
    }

    if (missed.length === 0) return

    // server doesn't include readReceipts here — default it like useSocketEvents does
    const withDefaults = (m: Message): Message => ({ ...m, readReceipts: m.readReceipts ?? [] })
    mergeRecoveredMessages(convId, missed.map(withDefaults), myUserId)

    // sidebar preview: show the newest message of this chat after the merge
    const merged = useChatStore.getState().messages[convId]
    updateLastMessage(convId, merged[merged.length - 1])
  } catch {
    // not fatal — the user can still scroll/reopen; just don't crash the app
    console.warn("[recovery] failed for conversation", convId)
  }
}
