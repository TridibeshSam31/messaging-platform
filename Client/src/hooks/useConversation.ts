import { useState, useCallback } from "react"
import { toast } from "sonner"
import { messageApi } from "@/api/message"
import { uploadApi } from "@/api/upload"
import { useChatStore } from "@/stores/chatStore"

export function useMessages(conversationId: string) {
  const [loadingOld, setLoadingOld] = useState(false)
  const [sending, setSending] = useState(false)
  const { setMessages, addOlderMessages, cursors, editMessageInStore, deleteMessageInStore } = useChatStore()

  /** Load the first page of messages for this conversation (newest 50). */
  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    try {
      const result = await messageApi.getPage(conversationId)
      // Backend returns newest first → reverse so oldest appears at the top
      setMessages(conversationId, result.messages.reverse(), result.nextCursor)
    } catch {
      toast.error("Failed to load messages")
    }
  }, [conversationId, setMessages])

  /** Load older messages when the user scrolls to the top. */
  const loadOlderMessages = useCallback(async () => {
    const cursor = cursors[conversationId]
    if (!cursor || loadingOld) return

    setLoadingOld(true)
    try {
      const result = await messageApi.getPage(conversationId, cursor)
      addOlderMessages(
        conversationId,
        result.messages.reverse(),
        result.nextCursor
      )
    } catch {
      toast.error("Failed to load older messages")
    } finally {
      setLoadingOld(false)
    }
  }, [conversationId, cursors, loadingOld, addOlderMessages])

  /** Send a message (with optional file attachments). */
  const sendMessage = useCallback(async (text: string, files: File[] = []) => {
    if (!text.trim() && files.length === 0) return

    setSending(true)
    try {
      let attachments: { url: string; mimeType: string; size: number; fileName: string }[] = []
      if (files.length > 0) {
        attachments = await uploadApi.uploadFiles(files)
      }

      const type = files.length > 0 ? getMimeCategory(files[0].type) : "TEXT"
      await messageApi.send(conversationId, text, type, attachments)
    } catch {
      toast.error("Failed to send message")
    } finally {
      setSending(false)
    }
  }, [conversationId])

  /** Edit an existing message. */
  const editMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const updated = await messageApi.edit(messageId, content)
      editMessageInStore(updated)
      return updated
    } catch {
      toast.error("Failed to edit message")
      throw new Error("Failed to edit message")
    }
  }, [editMessageInStore])

  /** Soft-delete a message. */
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await messageApi.delete(messageId)
      deleteMessageInStore(conversationId, messageId)
    } catch {
      toast.error("Failed to delete message")
      throw new Error("Failed to delete message")
    }
  }, [conversationId, deleteMessageInStore])

  return {
    loadMessages,
    loadOlderMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    loadingOld,
    sending,
  }
}

function getMimeCategory(mime: string): string {
  if (mime.startsWith("image/")) return "IMAGE"
  if (mime.startsWith("video/")) return "VIDEO"
  if (mime.startsWith("audio/")) return "AUDIO"
  return "FILE"
}
