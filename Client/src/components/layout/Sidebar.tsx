import { useState } from "react"
import { Search, Users, LogOut, MessageSquare, Check, MoreVertical, User as UserIcon } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Logo } from "@/components/ui/Logo"
import { useAuthStore } from "@/stores/authStore"
import { useChatStore } from "@/stores/chatStore"
import { useAuth } from "@/hooks/useAuth"
import { ConversationList } from "@/components/chat/ConversationList"
import { CreateGroupModal } from "@/components/group/CreateGroupModal"
import { StartPrivateChatModal } from "@/components/chat/StartPrivateChatModal"
import { ProfileModal } from "@/components/profile/ProfileModal"

export function Sidebar() {
  const [search, setSearch] = useState("")
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const { user } = useAuthStore()
  const { conversations, readReceiptsEnabled, setReadReceiptsEnabled } = useChatStore()
  const { handleLogout } = useAuth()

  const filtered = conversations.filter((conv) => {
    const other = conv.members.find((m) => m.userId !== user?.id)
    const label = conv.type === "GROUP" ? (conv.name ?? "") : (other?.user.name ?? "")
    return label.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <>
      <aside className="w-full h-full flex flex-col justify-between select-none bg-transparent relative">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
            <Logo size="sm" layout="horizontal" showText={false} />
            <DropdownMenu>
              <DropdownMenuTrigger
                id="sidebar-new-actions-btn"
                className="inline-flex items-center justify-center h-6 w-6 rounded text-[#8892c0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent"
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" className="w-48 bg-[#141528] border border-white/20 text-white text-xs z-[999] shadow-2xl">
                <DropdownMenuItem onClick={() => setShowChatModal(true)} className="hover:bg-amber-500/20 cursor-pointer text-xs py-2">
                  <MessageSquare className="h-3.5 w-3.5 mr-2 text-[#F59E0B]" />
                  New conversation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowGroupModal(true)} className="hover:bg-amber-500/20 cursor-pointer text-xs py-2">
                  <Users className="h-3.5 w-3.5 mr-2 text-[#F59E0B]" />
                  New group
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => setShowProfileModal(true)} className="hover:bg-amber-500/20 cursor-pointer text-xs py-2">
                  <UserIcon className="h-3.5 w-3.5 mr-2 text-[#F59E0B]" />
                  Profile settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search bar */}
          <div className="px-3 pb-2.5 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#6b7099] pointer-events-none" />
              <input
                id="sidebar-search"
                placeholder="Search User..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-[#13152a]/90 border border-white/[0.08] rounded-full text-white placeholder:text-[#6b7099] focus:outline-none focus:border-[#F59E0B]/50 transition-all"
              />
            </div>
          </div>

          {/* Conversation list */}
          <ScrollArea className="flex-1 px-2 scrollbar-thin overflow-y-auto min-h-0">
            <ConversationList conversations={filtered} onStartNewChat={() => setShowChatModal(true)} />
          </ScrollArea>
        </div>

        {/* Bottom User Bar */}
        {user && (
          <div className="px-3 py-2 flex items-center justify-between border-t border-white/[0.07] bg-black/20 shrink-0 relative z-20">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-7 w-7 border border-white/10 bg-[#2c2f50] shrink-0">
                <AvatarImage src={user.avatar ?? undefined} className="object-cover" />
                <AvatarFallback className="bg-[#2c2f50] text-[#F59E0B] font-bold text-[10px] flex items-center justify-center">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="h-3.5 w-3.5 text-white" />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold truncate leading-tight text-white">{user.name}</p>
                <p className="text-[10px] text-[#6b7099] truncate leading-tight">@{user.username}</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger id="sidebar-user-menu-btn" className="inline-flex items-center justify-center h-6 w-6 rounded text-[#6b7099] hover:text-white hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer">
                <MoreVertical className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-48 bg-[#141528] border border-white/20 text-white text-xs z-[999] shadow-2xl mb-1">
                <DropdownMenuItem onClick={() => setShowProfileModal(true)} className="hover:bg-amber-500/20 cursor-pointer text-xs py-2">
                  <UserIcon className="h-3.5 w-3.5 mr-2 text-[#F59E0B]" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setReadReceiptsEnabled(!readReceiptsEnabled)} className="hover:bg-amber-500/20 cursor-pointer text-xs py-2">
                  <Check className={`h-3 w-3 mr-2 text-[#F59E0B] transition-opacity ${readReceiptsEnabled ? "opacity-100" : "opacity-0"}`} />
                  Read receipts
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleLogout} className="text-rose-400 hover:bg-rose-950/40 cursor-pointer text-xs py-2">
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      <CreateGroupModal open={showGroupModal} onClose={() => setShowGroupModal(false)} />
      <StartPrivateChatModal open={showChatModal} onClose={() => setShowChatModal(false)} />
      <ProfileModal open={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
  )
}
