import { useState, useCallback } from "react"
import { Users, Pencil, Search, ArrowLeft, UserPlus, User as UserIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MemberList } from "./MemberList"
import { conversationApi } from "@/api/conversations"
import { userApi } from "@/api/users"
import { useChatStore } from "@/stores/chatStore"
import { toast } from "sonner"
import type { Conversation, User } from "@/types"

interface Props {
  conversation: Conversation
  open: boolean
  onClose: () => void
}

export function GroupSettings({ conversation, open, onClose }: Props) {
  const [name, setName] = useState(conversation.name ?? "")
  const [editingName, setEditingName] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  const { addOrUpdateConversation } = useChatStore()

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === conversation.name) {
      setEditingName(false)
      return
    }

    setSaving(true)
    try {
      const updated = await conversationApi.updateGroup(conversation.id, name.trim())
      addOrUpdateConversation({ ...conversation, ...updated })
      setEditingName(false)
      toast.success("Group name updated")
    } catch {
      toast.error("Failed to update group name")
    } finally {
      setSaving(false)
    }
  }

  const handleSearchUsers = useCallback(async (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await userApi.search(q)
      const memberIds = new Set(conversation.members.map((m) => m.userId))
      setSearchResults(res.filter((u) => !memberIds.has(u.id)))
    } catch {
      toast.error("Search failed")
    } finally {
      setSearching(false)
    }
  }, [conversation.members])

  const handleAddMember = async (targetUser: User) => {
    setAddingId(targetUser.id)
    try {
      const newMember = await conversationApi.addMember(conversation.id, targetUser.id)
      addOrUpdateConversation({
        ...conversation,
        members: [...conversation.members, newMember],
      })
      setSearchResults((prev) => prev.filter((u) => u.id !== targetUser.id))
      toast.success(`${targetUser.name} added to group`)
    } catch (error: any) {
      toast.error(error.response?.data?.error ?? "Failed to add member")
    } finally {
      setAddingId(null)
    }
  }

  const handleCloseDialog = () => {
    setShowAddMember(false)
    setSearchQuery("")
    setSearchResults([])
    setEditingName(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleCloseDialog()}>
      <DialogContent className="sm:max-w-md bg-[#12111C] border border-white/15 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            {showAddMember ? (
              <>
                <button
                  onClick={() => setShowAddMember(false)}
                  className="p-1 -ml-1 text-gray-400 hover:text-white rounded transition-colors bg-transparent border-0 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <UserPlus className="h-5 w-5 text-purple-400" />
                Add Members
              </>
            ) : (
              <>
                <Users className="h-5 w-5 text-purple-400" />
                Group Settings
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {showAddMember ? (
          <div className="space-y-4 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                id="add-member-search"
                placeholder="Search user to add..."
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#181624] border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#6D4AFF] text-sm"
                autoFocus
              />
            </div>

            {/* Results */}
            {searchResults.length > 0 && (
              <div className="border border-white/15 rounded-xl overflow-hidden divide-y divide-white/10 max-h-60 overflow-y-auto bg-[#161522]">
                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between px-3.5 py-2.5 hover:bg-white/[0.04] transition-colors"
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

                    <Button
                      size="sm"
                      onClick={() => handleAddMember(u)}
                      disabled={addingId === u.id}
                      className="h-7 text-xs bg-[#6D4AFF] hover:bg-[#5B3CC4] text-white px-2.5 shrink-0"
                    >
                      {addingId === u.id ? "Adding..." : "Add"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searching && (
              <p className="text-xs text-gray-400 text-center py-3">Searching…</p>
            )}

            {!searching && searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">No eligible users found</p>
            )}

            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddMember(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Back to Settings
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Group Name section */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Group Name
              </label>
              {editingName ? (
                <div className="flex gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#181624] border-white/15 text-white text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    disabled={saving}
                    className="bg-[#6D4AFF] hover:bg-[#5B3CC4] text-white"
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 bg-[#181624] border border-white/10 rounded-xl">
                  <span className="text-sm font-medium text-white">{conversation.name}</span>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-gray-400 hover:text-white transition-colors bg-transparent border-0 cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Member List component */}
            <MemberList
              conversation={conversation}
              onAddMemberClick={() => setShowAddMember(true)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
