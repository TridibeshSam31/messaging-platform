import { useState } from "react"
import { toast } from "sonner"
import { messageApi } from "../api/message"
import { uploadApi } from "@/api/upload"
import { useChatStore } from "@/stores/chatStore"
import { sendWS } from "@/socket/index"
import { WS_EVENTS, getMessageTypeFromMime } from "@/components/utils/constants"

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
      setMessages(conversationId, [...page].reverse(), nextCursor)
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
  //    not here — so no optimistic add on this path.
  //  - Any attachments -> REST POST, because Server/src/socket/handlers/
  //    chat.handler.ts is hard-coded to `{ type: "TEXT", content }` and has
  //    no attachment support. This path adds the message to the store
  //    immediately, since there's no ack event for REST-created messages —
  //    but it also means an attachment message won't show up live for the
  //    other participant until they reload or refetch. That's a real gap in
  //    the current backend, not something this hook can paper over — the
  //    clean fix is teaching chat.handler.ts to accept `type`/`attachments`
  //    the way the REST route already does.
  const sendMessage = async (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return
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
        const saved = await messageApi.send(conversationId, text, type, attachments)
        // sendMessage's Prisma `include` doesn't select readReceipts, so this
        // comes back without that field even though the Message type says
        // it's required — default it so nothing downstream trips on undefined.
        addNewMessage({ ...saved, readReceipts: saved.readReceipts ?? [] })
        updateLastMessage(conversationId, saved)
      } else {
        sendWS({ type: WS_EVENTS.CHAT, roomId: conversationId, message: text })
      }
    } catch {
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  return { loadMessages, loadOlderMessages, loadingOld, sendMessage, sending }
}