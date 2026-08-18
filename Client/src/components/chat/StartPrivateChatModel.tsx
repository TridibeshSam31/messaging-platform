import { useState, useCallback } from "react"
import { Search, UserPlus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { userApi } from "@/api/users"
import { conversationApi } from "@/api/conversations"
import { useChatStore } from "@/stores/chatStore"
import { useAuthStore } from "@/stores/authStore"
import { toast } from "sonner"
import type { User } from "@/types"

interface Props {
  open: boolean
  onClose: () => void
}

export function StartPrivateChatModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [creatingId, setCreatingId] = useState<string | null>(null)

  const { addOrUpdateConversation, setActiveConversation, conversations } = useChatStore()
  const { user: me } = useAuthStore()

  const search = useCallback(async (q: string) => {
    setQuery(q)
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = await userApi.search(q)
      setResults(res.filter((u) => u.id !== me?.id))
    } catch {
      toast.error("Search failed")
    } finally {
      setSearching(false)
    }
  }, [me?.id])

  const startChat = async (user: User) => {
    const existing = conversations.find(
      (c) => c.type === "PRIVATE" && c.members.some((m) => m.userId === user.id)
    )

    if (existing) {
      setActiveConversation(existing.id)
      handleClose()
      return
    }

    setCreatingId(user.id)
    try {
      const conv = await conversationApi.startPrivate(user.id)
      addOrUpdateConversation(conv)
      setActiveConversation(conv.id)
      handleClose()
    } catch (error: any) {
      toast.error(error.response?.data?.error ?? "Failed to start chat")
    } finally {
      setCreatingId(null)
    }
  }

  const handleClose = () => {
    setQuery("")
    setResults([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md bg-[#12111C] border border-white/15 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <UserPlus className="h-5 w-5 text-purple-400" />
            New Conversation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              id="private-chat-search"
              placeholder="Search user by name or username..."
              value={query}
              onChange={(e) => search(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#181624] border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#6D4AFF] text-sm"
              autoFocus
            />
          </div>

          {/* Search results */}
          {results.length > 0 && (
            <div className="border border-white/15 rounded-xl overflow-hidden divide-y divide-white/10 max-h-60 overflow-y-auto bg-[#161522]">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startChat(u)}
                  disabled={creatingId !== null}
                  className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-purple-900/30 transition-colors text-left disabled:opacity-50 border-0 cursor-pointer text-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0 border border-white/15 bg-purple-950">
                      <AvatarImage src={u.avatar ?? undefined} className="object-cover" />
                      <AvatarFallback className="text-xs bg-purple-900 text-white">
                        {u.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-white">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                    </div>
                  </div>
                  {creatingId === u.id && (
                    <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {searching && (
            <p className="text-xs text-gray-400 text-center py-3">Searching…</p>
          )}

          {!searching && query.trim().length > 0 && results.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">No users found</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
