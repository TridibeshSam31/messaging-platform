import { useState, useCallback } from "react"
import { Search, X, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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

export function CreateGroupModal({ open, onClose }: Props) {
  const [step, setStep] = useState<"name" | "members">("name")
  const [groupName, setGroupName] = useState("")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [selected, setSelected] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)

  const { addOrUpdateConversation } = useChatStore()
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

  const toggleMember = (u: User) => {
    const isAlreadySelected = selected.some((s) => s.id === u.id)
    if (isAlreadySelected) {
      setSelected((prev) => prev.filter((s) => s.id !== u.id))
    } else {
      setSelected((prev) => [...prev, u])
    }
    setQuery("")
    setResults([])
  }

  const removeMember = (id: string) => {
    setSelected((prev) => prev.filter((u) => u.id !== id))
  }

  const handleCreate = async () => {
    if (groupName.trim().length < 3) { toast.error("Group name must be at least 3 characters"); return }
    if (selected.length < 1) { toast.error("Add at least one member"); return }

    setCreating(true)
    try {
      const conv = await conversationApi.createGroup(
        groupName.trim(),
        selected.map((u) => u.id)
      )
      addOrUpdateConversation(conv)
      toast.success("Group created!")
      handleClose()
    } catch (error: any) {
      toast.error(error.response?.data?.error ?? "Failed to create group")
    } finally {
      setCreating(false)
    }
  }

  const handleClose = () => {
    setStep("name")
    setGroupName("")
    setQuery("")
    setResults([])
    setSelected([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md bg-[#12111C] border border-white/15 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-purple-400" />
            New Group
          </DialogTitle>
        </DialogHeader>

        {step === "name" ? (
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Step 1: Group name
              </label>
              <input
                id="group-name-input"
                placeholder="e.g. Design Team"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && groupName.trim().length >= 3) {
                    setStep("members")
                  }
                }}
                className="w-full px-4 py-2.5 bg-[#181624] border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#6D4AFF] text-sm"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 bg-transparent border-white/15 text-white hover:bg-white/10" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#6D4AFF] hover:bg-[#5B3CC4] text-white border-0"
                disabled={groupName.trim().length < 3}
                onClick={() => setStep("members")}
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="space-y-2 flex flex-col">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Step 2: Add members to "{groupName}"
              </label>
              
              {/* Selected members badge list */}
              {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 py-2">
                  {selected.map((u) => (
                    <Badge
                      key={u.id}
                      className="flex items-center gap-1.5 pr-1 pl-1 bg-purple-950/80 border border-purple-500/30 text-white rounded-full select-none py-0.5"
                    >
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={u.avatar ?? undefined} />
                        <AvatarFallback className="text-[8px] font-semibold bg-purple-900">
                          {u.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{u.name}</span>
                      <button
                        onClick={() => removeMember(u.id)}
                        className="text-gray-400 hover:text-white rounded-full p-0.5 transition-colors bg-transparent border-0 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Member search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <input
                  id="group-member-search"
                  placeholder="Search user by name or username..."
                  value={query}
                  onChange={(e) => search(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#181624] border border-white/15 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[#6D4AFF] text-sm"
                  autoFocus
                />
              </div>

              {/* Search results list */}
              {results.length > 0 && (
                <div className="border border-white/15 rounded-xl overflow-hidden divide-y divide-white/10 max-h-44 overflow-y-auto mt-2 bg-[#161522]">
                  {results.map((u) => {
                    const isSelected = selected.some((s) => s.id === u.id)
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleMember(u)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-purple-900/30 transition-colors text-left border-0 cursor-pointer text-white ${isSelected ? "bg-purple-900/20" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-7 w-7 shrink-0 border border-white/15 bg-purple-950">
                            <AvatarImage src={u.avatar ?? undefined} className="object-cover" />
                            <AvatarFallback className="text-xs font-semibold bg-purple-900 text-white">
                              {u.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate text-white">{u.name}</p>
                            <p className="text-xs text-gray-400 truncate">@{u.username}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-purple-400 mr-1" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {searching && (
                <p className="text-xs text-gray-400 text-center py-2">Searching…</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 bg-transparent border-white/15 text-white hover:bg-white/10" onClick={() => setStep("name")} disabled={creating}>
                Back
              </Button>
              <Button
                id="group-create-btn"
                className="flex-1 bg-[#6D4AFF] hover:bg-[#5B3CC4] text-white border-0"
                onClick={handleCreate}
                disabled={creating || selected.length === 0}
              >
                {creating ? "Creating…" : "Create Group"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
