 import { Info, ChevronLeft, User as UserIcon, MoreVertical, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useChatStore } from "@/stores/chatStore"
import { useAuthStore } from "@/stores/authStore"
import { useProfileToggle } from "@/components/layout/AppLayout"
import { conversationApi } from "@/api/conversations"
import { toast } from "sonner"
import type { Conversation } from "@/types"

interface Props {
  conversation: Conversation
}

export function ChatHeader({ conversation }: Props) {
  const { user } = useAuthStore()
  const { setActiveConversation, setConversations, conversations, onlineUsers } = useChatStore()
  const { toggleProfile } = useProfileToggle()

  const other = conversation.members.find((m) => m.userId !== user?.id)
  const isGroup = conversation.type === "GROUP"

  const name = isGroup
    ? (conversation.name ?? "Group Chat")
    : (other?.user.name ?? "User")

  const avatarSrc = isGroup
    ? (conversation.avatar ?? undefined)
    : (other?.user.avatar ?? undefined)

  const isOnline = !isGroup && !!other && onlineUsers.has(other.userId)

  const statusText = isGroup
    ? `(${conversation.members.length} ${conversation.members.length === 1 ? "member" : "members"})`
    : isOnline
    ? "Online"
    : "Offline"

  const groupInitials = isGroup
    ? (conversation.name ? conversation.name.slice(0, 2).toUpperCase() : "GC")
    : null

  const handleLeave = async () => {
    try {
      await conversationApi.leave(conversation.id)
      setActiveConversation(null)
      setConversations(conversations.filter((c) => c.id !== conversation.id))
      toast.success("Left conversation")
    } catch {
      toast.error("Failed to leave conversation")
    }
  }

  return (
    <header className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-white/[0.07] select-none bg-transparent">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile back */}
        <button
          onClick={() => setActiveConversation(null)}
          className="md:hidden inline-flex items-center justify-center h-6 w-6 rounded text-[#8892c0] hover:bg-white/10 hover:text-white transition-colors border-0 bg-transparent cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Group / User avatar */}
        <div className="relative shrink-0">
          {isGroup ? (
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#D97706] to-[#FBBF24] text-black font-extrabold flex items-center justify-center text-[10px] tracking-wide">
              {groupInitials}
            </div>
          ) : (
            <Avatar className="h-8 w-8 border-0 bg-[#2c2f50]">
              <AvatarImage src={avatarSrc} className="object-cover" />
              <AvatarFallback className="bg-[#2c2f50] text-[#8892c0] text-[10px] font-bold flex items-center justify-center">
                {other?.user.name ? other.user.name.slice(0, 2).toUpperCase() : <UserIcon className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Title + member count / online status */}
        <div className="flex items-baseline gap-1.5 min-w-0">
          <p className="font-bold text-[13px] text-white truncate leading-tight">
            {name}
          </p>
          <span className="text-[11px] text-[#8892c0] font-normal shrink-0">
            {statusText}
          </span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        {/* (i) Info button */}
        <button
          id="chat-header-info-btn"
          onClick={toggleProfile}
          className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-white/25 text-[#8892c0] hover:text-white hover:border-white/50 transition-colors bg-transparent cursor-pointer"
          title="Toggle info panel"
        >
          <Info className="h-3.5 w-3.5" />
        </button>

        {/* Options overflow */}
        <DropdownMenu>
          <DropdownMenuTrigger
            id="chat-header-menu-btn"
            className="inline-flex items-center justify-center h-7 w-7 rounded text-[#8892c0] hover:text-white hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#12111C] border border-white/15 text-white">
            <DropdownMenuItem
              id="chat-header-leave-btn"
              className="text-rose-400 hover:bg-rose-950/40 focus:bg-rose-950/40 cursor-pointer text-xs"
              onClick={handleLeave}
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Leave conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
