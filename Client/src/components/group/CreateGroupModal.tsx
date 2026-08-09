import { useState } from "react"
import { Search, Loader2, X } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "../ui/dialog"
import { Button }   from "../ui/button"
import { Input }    from "../ui/input"
import { Badge }    from "../ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { userApi }  from "../../api/users"
import { useConversations } from "../../hooks/useConversations"
import type { User } from "../../types"

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateGroupModal({ open, onClose }: Props) {
  const [name, setName]          = useState("")
  const [query, setQuery]        = useState("")
  const [results, setResults]    = useState<User[]>([])
  const [selected, setSelected]  = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating]  = useState(false)
  const { createGroup } = useConversations()

  const search = async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }

    setSearching(true)
    try {
      const users = await userApi.search(q)
      // Don't show users already selected
      setResults(users.filter(u => !selected.some(s => s.id === u.id)))
    } finally {
      setSearching(false)
    }
  }

  const addUser = (u: User) => {
    setSelected(prev => [...prev, u])
    setResults(prev => prev.filter(r => r.id !== u.id))
    setQuery("")
  }

  const removeUser = (userId: string) => {
    setSelected(prev => prev.filter(u => u.id !== userId))
  }

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) return
    setCreating(true)
    const conv = await createGroup(name, selected.map(u => u.id))
    if (conv) {
      onClose()
      setName("")
      setSelected([])
    }
    setCreating(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group name */}
          <Input
            placeholder="Group name"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          {/* Selected members as tags */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map(u => (
                <Badge key={u.id} variant="secondary" className="gap-1">
                  {u.name}
                  <button onClick={() => removeUser(u.id)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* User search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users to add..."
              value={query}
              onChange={e => search(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Search results */}
          {searching && (
            <div className="flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {results.map(u => (
            <button
              key={u.id}
              onClick={() => addUser(u)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={u.avatar ?? undefined} />
                <AvatarFallback>{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
            </button>
          ))}

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={creating || !name.trim() || selected.length === 0}
          >
            {creating
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
              : `Create with ${selected.length} member${selected.length !== 1 ? "s" : ""}`
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
