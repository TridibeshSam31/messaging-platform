import { Skeleton } from "../ui/skeleton"
import { ConversationItem } from "./ConversationItem"
import { useChatStore }  from "../../stores/chatStore"
import { useAuthStore }  from "../../stores/authStore"
import type { Conversation } from "../../types"

interface Props {
  conversations: Conversation[]
  loading?: boolean
}

export function ConversationList({ conversations, loading }: Props) {
  const { activeConversationId, setActiveConversation } = useChatStore()
  const { user } = useAuthStore()

  if (loading) {
    // Show skeleton placeholders while loading
    return (
      <div className="space-y-1 p-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm py-10">
        No conversations yet
      </p>
    )
  }

  return (
    <div>
      {conversations.map(conv => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === activeConversationId}
          currentUserId={user?.id ?? ""}
          onClick={() => setActiveConversation(conv.id)}
        />
      ))}
    </div>
  )
}
