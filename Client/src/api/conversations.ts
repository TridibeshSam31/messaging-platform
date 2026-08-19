import api from "./axios";
import type { Conversation, ConversationMember } from "../types"

export const conversationApi = {
  getAll: async (): Promise<Conversation[]> => {
    const res = await api.get("/conversations")
    return res.data
  },

  startPrivate: async (otherUserId: string): Promise<Conversation> => {
    const res = await api.post("/conversations", {
      type: "PRIVATE",
      otherUserId,
    })
    return res.data
  },
  
  createGroup: async (name: string, memberIds: string[]): Promise<Conversation> => {
    const res = await api.post("/conversations", {
      type: "GROUP",
      name,
      memberIds,
    })
    return res.data
  },

  updateGroup: async (conversationId: string, name: string): Promise<Conversation> => {
    const res = await api.patch(`/conversations/${conversationId}`, { name })
    return res.data
  },

  leave: async (conversationId: string): Promise<void> => {
    await api.delete(`/conversations/${conversationId}`)
  },

  addMember: async (conversationId: string, userId: string): Promise<ConversationMember> => {
    const res = await api.post(`/conversations/${conversationId}/members`, { userId })
    return res.data
  },

  removeMember: async (conversationId: string, userId: string): Promise<void> => {
    await api.delete(`/conversations/${conversationId}/members/${userId}`)
  },

  updateRole: async (conversationId: string, userId: string, role: "ADMIN" | "MEMBER"): Promise<void> => {
    await api.patch(`/conversations/${conversationId}/members/${userId}/role`, { role })
  },
}