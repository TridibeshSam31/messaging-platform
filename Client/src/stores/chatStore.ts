import {create} from "zustand"
import type { Conversation,Message } from "../types"

type ChatStore = {

    //list of conversations shown in the sidebar 
    conversations: Conversation[]

    //active conversation
    activeConversationId:string|null,

    //Messages per conversation: { "conv-id-123": [...messages] }
    messages:Record<string,Message[]>

    //cursors for loading older msgs
    cursors:Record<string,string|null>

    //who is typing in each conversation:{"conv-id-123":Set(["user-id"])}
    typingUsers: Record<string,Set<string>>

    onlineUsers:Set<string>

    setConversations: (list: Conversation[]) => void
   addOrUpdateConversation: (conv: Conversation) => void
  setActiveConversation: (id: string | null) => void
  clearUnread: (convId: string) => void
  updateLastMessage: (convId: string, msg: Message) => void
  setMessages: (convId: string, msgs: Message[], nextCursor: string | null) => void
  addOlderMessages: (convId: string, msgs: Message[], nextCursor: string | null) => void
  addNewMessage: (msg: Message) => void
  editMessageInStore: (msg: Message) => void
  deleteMessageInStore: (convId: string, msgId: string) => void
  setTyping: (convId: string, userId: string, isTyping: boolean) => void
  markOnline: (userId: string) => void
  markOffline: (userId: string) => void

}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  cursors: {},
  typingUsers: {},
  onlineUsers: new Set(),
  setConversations: (list) => set({ conversations: list }),
  addOrUpdateConversation: (conv) => {
    const existing = get().conversations.find(c => c.id === conv.id)
    if (existing) {
      // Update existing
      set({ conversations: get().conversations.map(c => c.id === conv.id ? conv : c) })
    } else {
      // Add to top of list
      set({ conversations: [conv, ...get().conversations] })
    }
  },
  setActiveConversation: (id) => set({ activeConversationId: id }),
  clearUnread: (convId) => {
    set({
      conversations: get().conversations.map(c =>
        c.id === convId ? { ...c, unreadCount: 0 } : c
      )
    })
  },
  updateLastMessage: (convId, msg) => {
    // Update the conversation's last message and move it to the top
    const updated = get().conversations.map(c =>
      c.id === convId ? { ...c, lastMessage: msg, updatedAt: msg.createdAt } : c
    )
    // Sort: most recently updated conversation goes first
    updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    set({ conversations: updated })
  },
  setMessages: (convId, msgs, nextCursor) => {
    set({
      messages: { ...get().messages, [convId]: msgs },
      cursors: { ...get().cursors, [convId]: nextCursor },
    })
  },
  addOlderMessages: (convId, msgs, nextCursor) => {
    // Prepend older messages to the front of the array
    const existing = get().messages[convId] || []
    set({
      messages: { ...get().messages, [convId]: [...msgs, ...existing] },
      cursors: { ...get().cursors, [convId]: nextCursor },
    })
  },
  addNewMessage: (msg) => {
    const existing = get().messages[msg.conversationId] || []
    // Deduplication: don't add if already in the list
    // (can happen if REST response + socket event both arrive)
    if (existing.some(m => m.id === msg.id)) return
    set({
      messages: {
        ...get().messages,
        [msg.conversationId]: [...existing, msg],
      }
    })
  },
  editMessageInStore: (updatedMsg) => {
    const existing = get().messages[updatedMsg.conversationId] || []
    set({
      messages: {
        ...get().messages,
        [updatedMsg.conversationId]: existing.map(m =>
          m.id === updatedMsg.id ? updatedMsg : m
        )
      }
    })
  },
  deleteMessageInStore: (convId, msgId) => {
    const existing = get().messages[convId] || []
    set({
      messages: {
        ...get().messages,
        [convId]: existing.map(m =>
          m.id === msgId
            ? { ...m, deletedAt: new Date().toISOString(), content: null, attachments: [] }
            : m
        )
      }
    })
  },
  setTyping: (convId, userId, isTyping) => {
    const current = new Set(get().typingUsers[convId] || [])
    if (isTyping) current.add(userId)
    else current.delete(userId)
    set({ typingUsers: { ...get().typingUsers, [convId]: current } })
  },
  markOnline: (userId) => {
    const next = new Set(get().onlineUsers)
    next.add(userId)
    set({ onlineUsers: next })
  },
  markOffline: (userId) => {
    const next = new Set(get().onlineUsers)
    next.delete(userId)
    set({ onlineUsers: next })
  },
}))