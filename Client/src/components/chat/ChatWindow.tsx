import { useEffect, useState } from "react"
import { MessageSquarePlus, Users, Sparkles } from "lucide-react"
import { Logo } from "@/components/ui/Logo"
import { useChatStore } from "@/stores/chatStore"
import { useMessages } from "@/hooks/useMessages"
import { ChatHeader } from "./ChatHeader"
import { MessageList } from "./MessageList"
import { MessageInput } from "./MessageInput"
import { TypingIndicator } from "./TypingIndicator"
import { StartPrivateChatModal } from "./StartPrivateChatModal"
import { CreateGroupModal } from "../group/CreateGroupModal"

export function ChatWindow() {
  const { activeConversationId, conversations } = useChatStore()
  const [showChatModal, setShowChatModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)

  const conversation = conversations.find((c) => c.id === activeConversationId)

  const { loadMessages } = useMessages(activeConversationId ?? "")

  useEffect(() => {
    if (!activeConversationId) return
    loadMessages()
  }, [activeConversationId])

  if (!conversation) {
    return (
      <>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-transparent relative overflow-hidden">
          <div className="max-w-sm flex flex-col items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] shadow-xl backdrop-blur-md">
              <Logo size="lg" showText={false} layout="vertical" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-bold text-lg text-white tracking-tight flex items-center justify-center gap-2">
                Welcome to Veyra
                <Sparkles className="h-4 w-4 text-[#F59E0B]" />
              </h2>
              <p className="text-xs text-[#8892c0] leading-relaxed max-w-xs">
                Private, instant, and seamless end-to-end messaging. Pick an existing chat or create a new one to begin.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowChatModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <MessageSquarePlus className="h-3.5 w-3.5 text-[#F59E0B]" />
                New Message
              </button>
              <button
                type="button"
                onClick={() => setShowGroupModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <Users className="h-3.5 w-3.5 text-[#F59E0B]" />
                New Group
              </button>
            </div>
          </div>
        </div>

        <StartPrivateChatModal open={showChatModal} onClose={() => setShowChatModal(false)} />
        <CreateGroupModal open={showGroupModal} onClose={() => setShowGroupModal(false)} />
      </>
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