import { useEffect } from "react"
import { Logo } from "@/components/ui/Logo"
import { useChatStore } from "@/stores/chatStore"
import { useAuthStore } from "@/stores/authStore"
import { useMessages } from "@/hooks/useMessages"
import { ChatHeader } from "./ChatHeader"
import { MessageList } from "./MessageList"
import { MessageInput } from "./MessageInput"
import { TypingIndicator } from "./TypingIndicator"
import { sendWS } from "@/socket"

export function ChatWindow() {
  const { activeConversationId, conversations, clearUnread, messages, updateLastRead, readReceiptsEnabled } = useChatStore()
  const { user } = useAuthStore()
  const conversation = conversations.find((c) => c.id === activeConversationId)
  const { loadMessages } = useMessages(activeConversationId ?? "")

  const convMessages = activeConversationId ? messages[activeConversationId] ?? [] : []

  useEffect(() => {
    if (!activeConversationId) return
    loadMessages()
    clearUnread(activeConversationId)
  }, [activeConversationId])

  useEffect(() => {
    if (!activeConversationId || convMessages.length === 0 || !user || !conversation || !readReceiptsEnabled) return

    const lastMsg = [...convMessages].reverse().find(m => m.type !== "SYSTEM")
    if (lastMsg && lastMsg.senderId !== user.id) {
      const myMember = conversation.members.find((m) => m.userId === user.id)
      if (myMember && myMember.lastReadMessageId !== lastMsg.id) {
        sendWS({
          type: "read",
          messageId: lastMsg.id,
          conversationId: activeConversationId,
        })
        updateLastRead(activeConversationId, user.id, lastMsg.id)
      }
    }
  }, [activeConversationId, convMessages.length, user?.id, conversation, updateLastRead, readReceiptsEnabled])

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 select-none bg-transparent relative overflow-hidden">
        <div className="flex flex-col items-center gap-3">
          <Logo size="lg" showText={false} layout="vertical" />
          <h2 className="font-semibold text-lg text-white tracking-wide">
            Chat anytime, anywhere
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      <ChatHeader conversation={conversation} />
      <MessageList conversationId={conversation.id} />
      <TypingIndicator conversationId={conversation.id} />
      <MessageInput conversationId={conversation.id} />
    </div>
  )
}
