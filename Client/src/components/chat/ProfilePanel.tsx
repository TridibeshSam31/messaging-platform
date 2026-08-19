import { useState } from "react"
import { User as UserIcon, Film, Users, Settings } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthStore } from "@/stores/authStore"
import { useChatStore } from "@/stores/chatStore"
import { useAuth } from "@/hooks/useAuth"
import { GroupSettings } from "@/components/group/GroupSettings"
import type { Conversation } from "@/types"

interface ProfilePanelProps {
  conversation: Conversation | null
}

export function ProfilePanel({ conversation }: ProfilePanelProps) {
  const { user } = useAuthStore()
  const { messages, onlineUsers } = useChatStore()
  const { handleLogout } = useAuth()
  const [showGroupSettings, setShowGroupSettings] = useState(false)

  if (!conversation) {
    return (
      <aside className="w-full h-full flex flex-col justify-between select-none bg-transparent p-4">
        <div className="space-y-4 pt-4">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-16 w-16 border border-white/10 bg-[#1e2140] shadow-md mb-3">
              <AvatarImage src={user?.avatar ?? undefined} className="object-cover" />
              <AvatarFallback className="bg-[#1e2140] text-[#F59E0B] font-bold text-lg flex items-center justify-center">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="h-7 w-7 text-white" />}
              </AvatarFallback>
            </Avatar>

            <h3 className="text-sm font-bold text-white tracking-tight">
              {user?.name ?? "VEYRA User"}
            </h3>
            <p className="text-xs text-[#8892c0] mt-0.5">@{user?.username}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-gray-300">Online</span>
            </div>
          </div>

          <div className="h-px bg-white/[0.07] w-full" />

          <div className="text-center px-3 py-6">
            <p className="text-xs text-gray-400 leading-relaxed">
              Select a conversation to view chat details, members, and shared media.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button onClick={handleLogout} className="veyra-btn-logout">
            Logout
          </button>
        </div>
      </aside>
    )
  }

  const otherMember = conversation.members.find((m) => m.userId !== user?.id)
  const isGroup = conversation.type === "GROUP"
  const profileUser = !isGroup && otherMember ? otherMember.user : null

  const displayName = isGroup
    ? (conversation.name ?? "Group Chat")
    : profileUser
      ? profileUser.name
      : (user?.name ?? "User")

  const isOnline = !!profileUser && onlineUsers.has(profileUser.id)
  const statusSubtitle = isGroup
    ? `${conversation.members.length} ${conversation.members.length === 1 ? "member" : "members"}`
    : isOnline
      ? "Online"
      : "Offline"

  const avatarUrl = isGroup
    ? (conversation.avatar ?? undefined)
    : profileUser
      ? (profileUser.avatar ?? undefined)
      : (user?.avatar ?? undefined)

  const groupInitials = isGroup
    ? (conversation.name ? conversation.name.slice(0, 2).toUpperCase() : "GC")
    : null

  const members = conversation.members ?? []

  const convMessages = messages[conversation.id] ?? []
  const mediaAttachments = convMessages
    .flatMap((m) => m.attachments ?? [])
    .filter((a) => a.mimeType.startsWith("image/") || a.mimeType.startsWith("video/"))

  return (
    <aside className="w-full h-full flex flex-col justify-between select-none bg-transparent">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pt-5 pb-2 space-y-3.5">
        <div className="flex flex-col items-center text-center">
          {isGroup ? (
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-[#D97706] to-[#FBBF24] text-black font-extrabold text-lg flex items-center justify-center shadow-lg shadow-amber-950/20 mb-2.5 tracking-wide">
              {groupInitials}
            </div>
          ) : (
            <Avatar className="h-16 w-16 border border-white/10 bg-[#1e2140] shadow-md mb-2.5">
              <AvatarImage src={avatarUrl} className="object-cover" />
              <AvatarFallback className="bg-[#1e2140] text-[#F59E0B] font-bold text-lg flex items-center justify-center">
                {profileUser?.name ? profileUser.name.slice(0, 2).toUpperCase() : <UserIcon className="h-7 w-7 text-white" />}
              </AvatarFallback>
            </Avatar>
          )}

          <h3 className="text-sm font-bold text-white tracking-tight leading-tight">{displayName}</h3>
          {!isGroup && profileUser && <p className="text-xs text-[#8892c0] mt-0.5">@{profileUser.username}</p>}
          <p className="text-xs text-[#8892c0] mt-1 flex items-center justify-center gap-1.5">
            {!isGroup && <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-500"}`} />}
            {statusSubtitle}
          </p>
        </div>

        <div className="h-px bg-white/[0.07] w-full" />

        {isGroup && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#b0b8d4]">
              <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-[#F59E0B]" />Members</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400 font-normal">{members.length}</span>
                {conversation.members.some((m) => m.userId === user?.id && m.role === "ADMIN") && (
                  <button
                    onClick={() => setShowGroupSettings(true)}
                    className="p-1 text-gray-400 hover:text-white rounded transition-colors bg-transparent border-0 cursor-pointer"
                    title="Group Settings"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-0.5">
              {members.map((m) => {
                const memberOnline = onlineUsers.has(m.userId)
                return (
                  <div key={m.userId} className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-white/[0.03]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="h-7 w-7 border-0 bg-[#2c2f50]">
                          <AvatarImage src={m.user.avatar ?? undefined} className="object-cover" />
                          <AvatarFallback className="bg-[#2c2f50] text-[#8892c0] text-[10px] font-bold flex items-center justify-center">
                            {m.user.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {memberOnline && <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-[#0c0d1b]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-[#c8cfea] font-medium truncate leading-tight">
                          {m.user.name} {m.userId === user?.id && <span className="text-[10px] text-[#F59E0B]">(You)</span>}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">@{m.user.username}</p>
                      </div>
                    </div>
                    {m.role === "ADMIN" && (
                      <span className="text-[9px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded shrink-0">
                        Admin
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {isGroup && <div className="h-px bg-white/[0.07] w-full" />}

        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#b0b8d4] flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-[#F59E0B]" />
            Shared Media
          </span>
          {mediaAttachments.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {mediaAttachments.slice(0, 6).map((att) => (
                <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="aspect-square rounded-md overflow-hidden border border-white/10 bg-white/5 hover:opacity-80 transition-opacity">
                  {att.mimeType.startsWith("image/") ? (
                    <img src={att.url} alt="media" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-amber-950/40 text-amber-400">
                      <Film className="w-4 h-4" />
                    </div>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 py-1">No shared media in this chat</p>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 shrink-0">
        <button onClick={handleLogout} className="veyra-btn-logout">
          Logout
        </button>
      </div>

      {isGroup && conversation && (
        <GroupSettings
          conversation={conversation}
          open={showGroupSettings}
          onClose={() => setShowGroupSettings(false)}
        />
      )}
    </aside>
  )
}
