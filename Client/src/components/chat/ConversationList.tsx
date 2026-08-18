import { Skeleton } from "@/components/ui/skeleton"
import { ConversationItem } from "./ConversationItem"
import { useChatStore } from "@/stores/chatStore"
import type { Conversation } from "@/types"

interface Props {
  conversations: Conversation[]
  loading?: boolean
  onStartNewChat?: () => void
}

export function ConversationList({ conversations, loading, onStartNewChat }: Props) {
  const { activeConversationId, setActiveConversation } = useChatStore()

  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
            <Skeleton className="h-9 w-9 rounded-full shrink-0 bg-white/10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3 bg-white/10" />
              <Skeleton className="h-3 w-2/3 bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center text-center p-6 space-y-3 select-none mx-2 mt-6">
        <div className="text-xs font-semibold text-white">No conversations yet</div>
        <p className="text-[11px] text-gray-400 max-w-[200px] leading-relaxed">
          Search for someone to start a conversation.
        </p>
        {onStartNewChat && (
          <button
            onClick={onStartNewChat}
            className="text-xs font-medium px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#9333EA] to-[#7C3AED] hover:from-[#8B5CF6] hover:to-[#6D28D9] text-white transition-all border-0 cursor-pointer shadow-md shadow-purple-950/30"
          >
            New conversation
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="py-1 space-y-0.5">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === activeConversationId}
          onClick={() => setActiveConversation(conv.id)}
        />
      ))}
    </div>
  )
}
