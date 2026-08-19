import { useState } from "react"
import { Users, Pencil } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MemberList } from "./MemberList"
import { useChatStore } from "@/stores/chatStore"
import { toast } from "sonner"
import type { Conversation } from "@/types"

interface Props {
  conversation: Conversation
  open: boolean
  onClose: () => void
}

export function GroupSettings({ conversation, open, onClose }: Props) {
  const [name, setName] = useState(conversation.name ?? "")
  const [editingName, setEditingName] = useState(false)
  const [saving, setSaving] = useState(false)
  const { addOrUpdateConversation } = useChatStore()

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === conversation.name) {
      setEditingName(false)
      return
    }

    setSaving(true)
    try {
      const updated = { ...conversation, name: name.trim() }
      addOrUpdateConversation(updated)
      setEditingName(false)
      toast.success("Group name updated")
    } catch {
      toast.error("Failed to update group name")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md bg-[#12111C] border border-white/15 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-purple-400" />
            Group Settings
          </DialogTitle>
        </DialogHeader>

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
          <MemberList conversation={conversation} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
