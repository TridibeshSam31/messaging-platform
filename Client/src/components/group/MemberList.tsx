import { useState } from "react"
import { Trash2, UserPlus, User as UserIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { conversationApi } from "@/api/conversations"
import { useChatStore } from "@/stores/chatStore"
import { useAuthStore } from "@/stores/authStore"
import { toast } from "sonner"
import type { Conversation, ConversationMember } from "@/types"

interface Props {
  conversation: Conversation
  onAddMemberClick?: () => void
}

export function MemberList({ conversation, onAddMemberClick }: Props) {
  const { user: me } = useAuthStore()
  const { addOrUpdateConversation } = useChatStore()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const myMember = conversation.members.find((m) => m.userId === me?.id)
  const isAdmin = myMember?.role === "ADMIN"

  const handleRemove = async (member: ConversationMember) => {
    setLoadingId(member.userId)
    try {
      await conversationApi.leave(conversation.id)
      addOrUpdateConversation({ ...conversation, members: conversation.members.filter(m => m.userId !== member.userId) })
      toast.success(`${member.user.name} removed from group`)
    } catch {
      toast.error("Failed to remove member")
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-3 select-none">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Members ({conversation.members.length})
        </span>
        {isAdmin && onAddMemberClick && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAddMemberClick}
            className="h-7 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 px-2 flex items-center gap-1"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>

      <div className="space-y-1 max-h-60 overflow-y-auto scrollbar-thin pr-1">
        {conversation.members.map((m) => {
          const isSelf = m.userId === me?.id
          const isMemberAdmin = m.role === "ADMIN"

          return (
            <div
              key={m.userId}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="h-7 w-7 border-0 bg-[#a3a6b4] shrink-0">
                  <AvatarImage src={m.user.avatar ?? undefined} className="object-cover" />
                  <AvatarFallback className="bg-[#a3a6b4] text-white flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate flex items-center gap-1">
                    {m.user.name}
                    {isSelf && <span className="text-[10px] text-gray-400">(You)</span>}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">@{m.user.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Badge
                  variant={isMemberAdmin ? "default" : "secondary"}
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isMemberAdmin
                      ? "bg-purple-900/80 text-purple-300 border border-purple-500/30"
                      : "bg-white/10 text-gray-400"
                  }`}
                >
                  {m.role}
                </Badge>

                {isAdmin && !isSelf && (
                  <button
                    onClick={() => handleRemove(m)}
                    disabled={loadingId === m.userId}
                    className="p-1 text-gray-400 hover:text-rose-400 rounded transition-colors bg-transparent border-0 cursor-pointer disabled:opacity-50"
                    title="Remove from group"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
