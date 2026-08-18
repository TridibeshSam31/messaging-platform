import { User as UserIcon, MoreVertical, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/stores/authStore"
import { useChatStore } from "@/stores/chatStore"
import { conversationApi } from "@/api/conversations"
import { toast } from "sonner"
import type { Conversation } from "@/types"

interface Props {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

export function ConversationItem({ conversation, isActive, onClick }: Props) {
  const { user } = useAuthStore()
  const { onlineUsers, setActiveConversation, setConversations, conversations } = useChatStore()

  const other = conversation.members.find((m) => m.userId !== user?.id)
  const isGroup = conversation.type === "GROUP"

  const name = isGroup
    ? (conversation.name ?? "Group Chat")
    : (other?.user.name ?? "User")

  const isOnline = !isGroup && !!other && onlineUsers.has(other.userId)

  const statusText = isGroup
    ? `${conversation.members.length} ${conversation.members.length === 1 ? "member" : "members"}`
    : isOnline
    ? "Online"
    : "Offline"

  const avatarSrc = isGroup
    ? (conversation.avatar ?? undefined)
    : (other?.user.avatar ?? undefined)

  const groupInitials = isGroup
    ? (conversation.name ? conversation.name.slice(0, 2).toUpperCase() : "GC")
    : null

  const handleLeave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await conversationApi.leave(conversation.id)
      if (isActive) setActiveConversation(null)
      setConversations(conversations.filter((c) => c.id !== conversation.id))
      toast.success("Left conversation")
    } catch {
      toast.error("Failed to leave conversation")
    }
  }

  return (
    <div
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg my-px
        transition-all duration-100 cursor-pointer select-none group relative
        ${isActive
          ? "bg-[#1e2140] border border-[#353860]/80 text-white"
          : "bg-transparent border border-transparent text-[#b0b8d4] hover:bg-white/[0.04] hover:text-white"}
      `}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {isGroup ? (
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#D97706] to-[#FBBF24] text-black font-extrabold flex items-center justify-center text-[11px] tracking-wide shadow-sm">
            {groupInitials}
          </div>
        ) : (
          <Avatar className="h-9 w-9 border-0 bg-[#2c2f50] shrink-0">
            <AvatarImage src={avatarSrc} className="object-cover" />
            <AvatarFallback className="bg-[#2c2f50] text-[#8892c0] text-[10px] font-bold flex items-center justify-center">
              {other?.user.name ? other.user.name.slice(0, 2).toUpperCase() : <UserIcon className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[12px] truncate leading-tight text-white">{name}</p>
        <p className="text-[10px] text-[#6b7099] truncate leading-tight mt-0.5">
          {statusText}
        </p>
      </div>

      {/* Unread badge + options */}
      <div className="flex items-center gap-1 shrink-0">
        {conversation.unreadCount > 0 && (
          <span className="bg-[#F59E0B] text-black text-[9px] font-extrabold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
            {conversation.unreadCount}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-[#6b7099] hover:text-white rounded transition-opacity border-0 bg-transparent cursor-pointer"
          >
            <MoreVertical className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#12111C] border border-white/15 text-white">
            <DropdownMenuItem
              onClick={handleLeave}
              className="text-rose-400 hover:bg-rose-950/40 focus:bg-rose-950/40 cursor-pointer text-xs"
            >
              <LogOut className="h-3 w-3 mr-2" />
              Leave conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
