import api from "./axios"
import type { Message } from "../types"

type PaginatedResult = {
  messages: Message[]
  nextCursor: string | null
}

type AttachmentInput = {
  url: string
  mimeType: string
  size: number
  fileName: string
}

export const messageApi = {
  getPage: async (
    convId: string,
    cursor?: string
  ): Promise<PaginatedResult> => {
    const res = await api.get(`/conversations/${convId}/messages`, {
      params: { cursor, limit: 50 },
    })
    return res.data
  },

  send: async (
    convId: string,
    content: string,
    type: string = "TEXT",
    attachments: AttachmentInput[] = []
  ): Promise<Message> => {
    const res = await api.post(`/conversations/${convId}/messages`, {
      content: content || undefined,
      type,
      attachments,
    })
    return res.data
  },

  edit: async (msgId: string, newContent: string): Promise<Message> => {
    const res = await api.patch(`/messages/${msgId}`, { content: newContent })
    return res.data
  },

  delete: async (msgId: string): Promise<void> => {
    await api.delete(`/messages/${msgId}`)
  },

  markRead: async (msgId: string, convId: string): Promise<void> => {
    await api.post(`/messages/${msgId}/read`, { conversationId: convId })
  },
}
