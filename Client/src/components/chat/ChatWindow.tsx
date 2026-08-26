import { useEffect } from "react"

import { Logo } from "@/components/ui/Logo"

import { useChatStore } from "@/stores/chatStore"
import { useMessages } from "@/hooks/useMessages"

import { ChatHeader } from "./ChatHeader"
import { MessageList } from "./MessageList"
import { MessageInput } from "./MessageInput"
import { TypingIndicator } from "./TypingIndicator"

export function ChatWindow() {
  const {
    activeConversationId,
    conversations,
  } = useChatStore()

  const conversation = conversations.find(
    (c) => c.id === activeConversationId
  )

  const { loadMessages } = useMessages(
    activeConversationId ?? ""
  )

  useEffect(() => {
    if (!activeConversationId) return

    loadMessages()
  }, [activeConversationId])

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 select-none bg-transparent relative overflow-hidden">
        <div className="flex flex-col items-center gap-3">
          <Logo
            size="lg"
            showText={false}
            layout="vertical"
          />

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