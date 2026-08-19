import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { conversationApi } from "@/api/conversations"
import { useAuthStore } from "@/stores/authStore"
import { useChatStore } from "@/stores/chatStore"

// Loads the current user's conversation list once per login and drops it
// into chatStore. ChatPage calls this with no return value — it's a pure
// side-effect hook, same pattern as `useEffect`-only hooks elsewhere here.
export function useConversation() {
  const { user } = useAuthStore()
  const { setConversations } = useChatStore()

  // Guards against re-fetching on every re-render, while still re-fetching
  // if a different user logs in during the same tab session.
  const fetchedForUserId = useRef<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (fetchedForUserId.current === user.id) return
    fetchedForUserId.current = user.id

    conversationApi
      .getAll()
      .then(setConversations)
      .catch(() => {
        toast.error("Failed to load conversations")
      })
  }, [user, setConversations])
}