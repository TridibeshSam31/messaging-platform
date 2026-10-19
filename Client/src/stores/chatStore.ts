import { create } from "zustand"
import type { Conversation, Message, User } from "../types"

type ChatStore = {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, Message[]>
  cursors: Record<string, string | null>
  typingUsers: Record<string, Set<string>>
  onlineUsers: Set<string>
  lastDeliveredMessageIds: Record<string, string>
  readReceiptsEnabled: boolean

  setConversations: (list: Conversation[]) => void
  addOrUpdateConversation: (conv: Conversation) => void
  setActiveConversation: (id: string | null) => void
  clearUnread: (convId: string) => void
  updateLastMessage: (convId: string, msg: Message) => void
  setMessages: (convId: string, msgs: Message[], nextCursor: string | null) => void
  addOlderMessages: (convId: string, msgs: Message[], nextCursor: string | null) => void
  addNewMessage: (
    msg: Message,
    isIncoming: boolean,
    isActiveConversation: boolean
  ) => void
  mergeRecoveredMessages: (convId: string, msgs: Message[], myUserId: string) => void
  setMessageStatus: (convId: string, clientMessageId: string, status: "sending" | "failed") => void
  editMessageInStore: (msg: Message) => void
  deleteMessageInStore: (convId: string, msgId: string) => void
  setTyping: (convId: string, userId: string, isTyping: boolean) => void
  markDelivered: (messageId: string) => void
  markOnline: (userId: string) => void
  markOffline: (userId: string) => void
  updateLastRead: (convId: string, userId: string, messageId: string) => void
  updateUserInStore: (updatedUser: Partial<User> & { id: string }) => void
  setReadReceiptsEnabled: (enabled: boolean) => void
  
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  cursors: {},
  typingUsers: {},
  onlineUsers: new Set(),
  lastDeliveredMessageIds: {},
  readReceiptsEnabled: localStorage.getItem("read_receipts_enabled") !== "false",

  setConversations: (list) => {
    const nextOnline = new Set<string>()
    for (const conv of list) {
      for (const m of conv.members) {
        if (m.user?.status === "ONLINE") nextOnline.add(m.userId)
      }
    }
    set({ conversations: list, onlineUsers: nextOnline })
  },

  addOrUpdateConversation: (conv) => {
    const nextOnline = new Set(get().onlineUsers)
    for (const m of conv.members) {
      if (m.user?.status === "ONLINE") nextOnline.add(m.userId)
    }
    const existing = get().conversations.find((c) => c.id === conv.id)
    if (existing) {
      set({
        conversations: get().conversations.map((c) => (c.id === conv.id ? conv : c)),
        onlineUsers: nextOnline,
      })
    } else {
      set({
        conversations: [conv, ...get().conversations],
        onlineUsers: nextOnline,
      })
    }
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),
  clearUnread: (convId) => {
    set({
      conversations: get().conversations.map((c) =>
        c.id === convId ? { ...c, unreadCount: 0 } : c
      ),
    })
  },

  updateLastMessage: (convId, msg) => {
    const updated = get().conversations.map((c) =>
      c.id === convId ? { ...c, lastMessage: msg, updatedAt: msg.createdAt } : c
    )
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
    const existing = get().messages[convId] || []
    set({
      messages: { ...get().messages, [convId]: [...msgs, ...existing] },
      cursors: { ...get().cursors, [convId]: nextCursor },
    })
  },

  addNewMessage: (msg, isIncoming, isActiveConversation) => {
    const state = get()
    const existing = state.messages[msg.conversationId] || []

    if (existing.some((m) => m.id === msg.id)) {
        return
    }

    // Phase 6: this is the server's version of a message we already show
    // optimistically ("sending…") — swap it in place instead of adding a second bubble
    if (msg.clientMessageId) {
        const i = existing.findIndex((m) => m.clientMessageId === msg.clientMessageId)
        if (i !== -1) {
            const next = [...existing]
            next[i] = msg
            set({ messages: { ...state.messages, [msg.conversationId]: next } })
            return
        }
    }

    const conversations = state.conversations.map((c) => {
        if (
            c.id === msg.conversationId &&
            isIncoming &&
            !isActiveConversation
        ) {
            return {
                ...c,
                unreadCount: c.unreadCount + 1,
            }
        }

        return c
    })

    set({
        messages: {
            ...state.messages,
            [msg.conversationId]: [...existing, msg],
        },
        conversations,
    })
},

  // Phase 2: add messages fetched after a reconnect. Some of them may already
  // be here (arrived over WS once the socket came back), so skip known ids,
  // then sort by time because recovered ones can be older than those WS ones.
  mergeRecoveredMessages: (convId, msgs, myUserId) => {
    const state = get()
    // Phase 6: if the server already has one of our "sending…" messages, drop the
    // optimistic copy — the real one from `msgs` replaces it below
    const recoveredClientIds = new Set(msgs.map((m) => m.clientMessageId).filter(Boolean))
    const existing = (state.messages[convId] || []).filter(
      (m) => !(m.status && m.clientMessageId && recoveredClientIds.has(m.clientMessageId))
    )

    const knownIds = new Set(existing.map((m) => m.id))
    const fresh = msgs.filter((m) => !knownIds.has(m.id)) // dedupe
    if (fresh.length === 0) return

    const merged = [...existing, ...fresh].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    // same unread rule as addNewMessage: only others' messages, only if the chat isn't open
    const isActive = state.activeConversationId === convId
    const newIncoming = fresh.filter((m) => m.senderId !== myUserId).length

    set({
      messages: { ...state.messages, [convId]: merged },
      conversations: isActive
        ? state.conversations
        : state.conversations.map((c) =>
            c.id === convId ? { ...c, unreadCount: c.unreadCount + newIncoming } : c
          ),
    })
  },

  // Phase 6: flip an optimistic message between "sending" and "failed"
  setMessageStatus: (convId, clientMessageId, status) => {
    const existing = get().messages[convId] || []
    set({
      messages: {
        ...get().messages,
        [convId]: existing.map((m) =>
          m.clientMessageId === clientMessageId && m.status ? { ...m, status } : m
        ),
      },
    })
  },

  editMessageInStore: (updatedMsg) => {
    const existing = get().messages[updatedMsg.conversationId] || []
    set({
      messages: {
        ...get().messages,
        [updatedMsg.conversationId]: existing.map((m) =>
          // merge instead of replace: the server's edit response has no readReceipts,
          // so `{ ...m, ...updatedMsg }` keeps the existing ones (read ticks stay visible)
          m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m
        ),
      },
    })
  },

  deleteMessageInStore: (convId, msgId) => {
    const existing = get().messages[convId] || []
    set({
      messages: {
        ...get().messages,
        [convId]: existing.map((m) =>
          m.id === msgId
            ? { ...m, deletedAt: new Date().toISOString(), content: null, attachments: [] }
            : m
        ),
      },
    })
  },

  setTyping: (convId, userId, isTyping) => {
    const current = new Set(get().typingUsers[convId] || [])
    if (isTyping) current.add(userId)
    else current.delete(userId)
    set({ typingUsers: { ...get().typingUsers, [convId]: current } })
  },

  // message_delivered (delivered.handler.ts) only carries { messageId,
  // deliveredTo, deliveredAt } — no conversationId — so we look up which
  // conversation the message belongs to from what's already loaded.
  markDelivered: (messageId) => {
    const state = get()
    for (const [convId, msgs] of Object.entries(state.messages)) {
      if (msgs.some((m) => m.id === messageId)) {
        set({
          lastDeliveredMessageIds: { ...state.lastDeliveredMessageIds, [convId]: messageId },
        })
        return
      }
    }
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

  updateLastRead: (convId, userId, messageId) => {
    set({
      conversations: get().conversations.map((c) => {
        if (c.id !== convId) return c
        return {
          ...c,
          members: c.members.map((m) =>
            m.userId === userId ? { ...m, lastReadMessageId: messageId } : m
          ),
        }
      }),
    })
  },

  updateUserInStore: (updatedUser) => {
    set((state) => {
      const nextConversations = state.conversations.map((c) => ({
        ...c,
        members: c.members.map((m) =>
          m.userId === updatedUser.id
            ? {
                ...m,
                user: {
                  ...m.user,
                  ...updatedUser,
                  avatar: updatedUser.avatar ?? m.user?.avatar ?? null,
                },
              }
            : m
        ),
      }))

      const nextMessages = Object.fromEntries(
        Object.entries(state.messages).map(([convId, msgs]) => [
          convId,
          msgs.map((msg) =>
            msg.senderId === updatedUser.id
              ? {
                  ...msg,
                  sender: {
                    ...msg.sender,
                    ...updatedUser,
                    avatar: updatedUser.avatar ?? msg.sender?.avatar ?? null,
                  },
                }
              : msg
          ),
        ])
      )

      return {
        conversations: nextConversations,
        messages: nextMessages,
      }
    })
  },

  setReadReceiptsEnabled: (enabled) => {
    localStorage.setItem("read_receipts_enabled", String(enabled))
    set({ readReceiptsEnabled: enabled })
  },
}))