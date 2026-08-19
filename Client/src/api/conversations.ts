import api from "./axios";
import type {Conversation} from "../types"

export const conversationApi = {
    getAll: async():Promise<Conversation[]> => {
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
  leave: async (conversationId: string): Promise<void> => {
    await api.delete(`/conversations/${conversationId}`)
  },

}