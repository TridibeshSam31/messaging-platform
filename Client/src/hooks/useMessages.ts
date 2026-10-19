import { useState } from "react"
import { toast } from "sonner"
import { isAxiosError } from "axios"
import { messageApi } from "../api/message"
import { uploadApi } from "@/api/upload"
import { useChatStore } from "@/stores/chatStore"
import { useAuthStore } from "@/stores/authStore"
import { queueMessage, buildOptimisticMessage, restoreOutboxMessages } from "@/socket/outbox"
import { getMessageTypeFromMime } from "@/components/utils/constants"

// Phase 6: retry a REST call when the failure might be temporary.
// Safe ONLY because the request carries a clientMessageId — the server returns the
// already-saved message instead of creating a second one if an earlier try got through.
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      // no response at all = network down / timeout; 5xx = server trouble → worth retrying.
      // 4xx (bad request, not a member, too large…) won't fix itself → give up immediately.
      const status = isAxiosError(error) ? error.response?.status : undefined
      const retryable = status === undefined || status >= 500
      if (!retryable || attempt >= tries) throw error
      // wait 1s, then 2s (exponential backoff, same idea as the socket reconnect)
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (attempt - 1)))
    }
  }
}

export function useMessages(conversationId: string) {
  const [loadingOld, setLoadingOld] = useState(false)
  const [sending, setSending] = useState(false)
  const { setMessages, addOlderMessages, addNewMessage, updateLastMessage, cursors } =
    useChatStore()

  // GET /conversations/:id/messages returns newest-first (see
  // Server/src/services/message.service.ts — orderBy createdAt: "desc").
  // MessageList renders oldest-to-newest top-to-bottom, so every page gets
  // reversed before it goes into the store.
  const loadMessages = async () => {
    if (!conversationId) return
    try {
      const { messages: page, nextCursor } = await messageApi.getPage(conversationId)
      const ordered = [...page].reverse()
      setMessages(conversationId, ordered, nextCursor)

      // Phase 6: after a refresh, show this chat's still-unsent messages again
      // (setMessages above replaced the list, so they'd be gone otherwise)
      const me = useAuthStore.getState().user
      if (me) restoreOutboxMessages(conversationId, ordered, me)
    } catch {
      toast.error("Failed to load messages")
    }
  }

  const loadOlderMessages = async () => {
    const cursor = cursors[conversationId]
    if (!cursor || loadingOld) return
    setLoadingOld(true)
    try {
      const { messages: page, nextCursor } = await messageApi.getPage(conversationId, cursor)
      addOlderMessages(conversationId, [...page].reverse(), nextCursor)
    } catch {
      toast.error("Failed to load older messages")
    } finally {
      setLoadingOld(false)
    }
  }

  // Two send paths, on purpose:
  //  - Plain text -> WS `chat` event. Server persists it AND broadcasts it to
  //    the rest of the room in real time; our own copy gets added to the
  //    store when the `message_ack` event comes back (see useSocketEvents),
  //    Phase 6: shown optimistically as "sending…" and retried by the outbox.
  //  - Any attachments -> REST POST, because Server/src/socket/handlers/
  //    chat.handler.ts is hard-coded to `{ type: "TEXT", content }` and has
  //    no attachment support. This path adds the message to the store
  //    immediately, since there's no ack event for REST-created messages.
  //  Either way the server's message service (Phase 5) saves the message and
  //  then broadcasts a `chat` event to the whole room, so attachment messages
  //  now show up live for the other participants too. The copy that comes
  //  back to this tab is ignored by addNewMessage's duplicate-id check.
  const sendMessage = async (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return
    const me = useAuthStore.getState().user
    if (!me) return

    // Phase 6: our own id for this message, generated BEFORE sending. Every retry
    // re-uses it, so the server can tell "same message again" from "new message".
    const clientMessageId = crypto.randomUUID()

    setSending(true)
    try {
      if (files.length > 0) {
        const uploaded = await uploadApi.uploadFiles(files)
        const type = getMessageTypeFromMime(uploaded[0].mimeType)
        const attachments = uploaded.map((f) => ({
          url: f.url,
          mimeType: f.mimeType,
          size: f.size,
          fileName: f.fileName,
        }))
        // Phase 6: the upload is done; retry only the POST, always with the same clientMessageId
        const saved = await withRetry(() =>
          messageApi.send(conversationId, text, type, attachments, clientMessageId)
        )
        // sendMessage's Prisma `include` doesn't select readReceipts, so this
        // comes back without that field even though the Message type says
        // it's required — default it so nothing downstream trips on undefined.
        addNewMessage({ ...saved, readReceipts: saved.readReceipts ?? [] }, false, true)
        updateLastMessage(conversationId, saved)
      } else {
        // Phase 6 — optimistic UI: show the bubble right away as "sending…".
        // `id` is temporary; when message_ack (or the chat broadcast) arrives,
        // addNewMessage finds it by clientMessageId and swaps in the real message.
        const createdAt = new Date().toISOString()
        addNewMessage(
          buildOptimisticMessage(
            { roomId: conversationId, message: text, clientMessageId, createdAt, status: "sending" },
            me
          ),
          false,
          true
        )
        // the outbox saves it (localStorage), sends it now, and retries until the server acks it
        queueMessage(conversationId, text, clientMessageId, createdAt)
      }
    } catch {
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  return { loadMessages, loadOlderMessages, loadingOld, sendMessage, sending }
}