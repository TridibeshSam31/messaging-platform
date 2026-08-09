import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Badge } from "../ui/badge"
import { useChatStore } from "../../stores/chatStore"
import type { Conversation } from "../../types"

interface Props {
  conversation: Conversation
  isActive: boolean
  currentUserId: string
  onClick: () => void
}

export function ConversationItem({ conversation, isActive, currentUserId, onClick }: Props) {
  const { onlineUsers } = useChatStore()

  // Find the other person in a private chat
  const other = conversation.members.find(m => m.userId !== currentUserId)

  // Figure out what name to show
  const name = conversation.type === "GROUP"
    ? conversation.name ?? "Group"
    : other?.user.name ?? "Unknown"

  // Is the other person online?
  const isOnline = conversation.type === "PRIVATE" && other && onlineUsers.has(other.userId)

  // Last message preview text
  const preview = conversation.lastMessage?.deletedAt
    ? "🚫 Message deleted"
    : conversation.lastMessage?.content ?? "No messages yet"

  // Time since last message
  const time = conversation.lastMessage
    ? formatDistanceToNow(new Date(conversation.lastMessage.createdAt))
    : ""

  const initials = name.slice(0, 2).toUpperCase()

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-left
        border-l-2 transition-colors hover:bg-accent/40
        ${isActive ? "bg-accent border-l-primary" : "border-l-transparent"}
      `}
    >
      {/* Avatar with online dot */}
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={other?.user.avatar ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-online border-2 border-background" />
        )}
      </div>

      {/* Name, preview, time */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-medium truncate">{name}</span>
          <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{time}</span>
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <span className="text-xs text-muted-foreground truncate">{preview}</span>
          {conversation.unreadCount > 0 && (
            <Badge className="ml-2 h-5 min-w-5 text-[10px] shrink-0 bg-primary">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}
