import { useEffect } from "react"
import { Toaster } from "@/components/ui/sonner"
import { AppLayout } from "@/components/layout/AppLayout"
import { ChatWindow } from "@/components/chat/ChatWindow"
import { useAuthStore } from "@/stores/authStore"
import { useChatStore } from "@/stores/chatStore"
import { useSocketStore } from "@/stores/socketStore"
import { useSocketEvents } from "@/socket/useSocketEvents"
import { useConversation } from "@/hooks/useConversation"

export function ChatPage() {
  const { user, loading } = useAuthStore()
  const { conversations } = useChatStore()
  const { connected } = useSocketStore()

  useConversation()
  const { joinRoom } = useSocketEvents()

  useEffect(() => {
    if (!connected) return
    for (const conv of conversations) {
      joinRoom(conv.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations.length, connected])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm">Connecting...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <AppLayout>
        <ChatWindow />
      </AppLayout>
      <Toaster position="bottom-right" richColors />
    </>
  )
}
