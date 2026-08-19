import { useState } from "react"
import { format } from "date-fns"
import { Pencil, Trash2, Check, CheckCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { messageApi } from "@/api/message"
import { useChatStore } from "@/stores/chatStore"
import { toast } from "sonner"
import type { Message } from "@/types"

interface Props {
  message: Message
  isOwn: boolean
  showAvatar: boolean
  conversationId: string
}

export function MessageBubble({ message, isOwn, showAvatar, conversationId }: Props) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.content ?? "")
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const { editMessageInStore, deleteMessageInStore, conversations, lastDeliveredMessageIds, messages } = useChatStore()

  const conv = conversations.find((c) => c.id === conversationId)
  const otherMember = conv?.members.find((m) => m.userId !== message.senderId)
  const otherMemberLastReadMessageId =
    otherMember && "lastReadMessageId" in otherMember
      ? (otherMember as { lastReadMessageId?: string }).lastReadMessageId
      : undefined

  const convMessages = messages[conversationId] ?? []
  const msgIndex = convMessages.findIndex((m) => m.id === message.id)

  const lastReadIndex = otherMemberLastReadMessageId
    ? convMessages.findIndex((m) => m.id === otherMemberLastReadMessageId)
    : -1

  const isRead =
    (otherMemberLastReadMessageId === message.id) ||
    (lastReadIndex !== -1 && msgIndex !== -1 && lastReadIndex >= msgIndex)

  const lastDeliveredId = lastDeliveredMessageIds[conversationId]
  const lastDeliveredIndex = lastDeliveredId
    ? convMessages.findIndex((m) => m.id === lastDeliveredId)
    : -1

  const isDelivered =
    isRead ||
    (lastDeliveredId === message.id) ||
    (lastDeliveredIndex !== -1 && msgIndex !== -1 && lastDeliveredIndex >= msgIndex)

  const isDeleted = !!message.deletedAt

  const handleEdit = async () => {
    if (!editText.trim()) return
    setSaving(true)
    try {
      const updated = await messageApi.edit(message.id, editText.trim())
      editMessageInStore(updated)
      setEditing(false)
    } catch {
      toast.error("Failed to edit message")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await messageApi.delete(message.id)
      deleteMessageInStore(conversationId, message.id)
      toast.success("Message deleted")
    } catch {
      toast.error("Failed to delete message")
    } finally {
      setShowDeleteDialog(false)
    }
  }

  const timeStr = format(new Date(message.createdAt), "HH:mm")

  return (
    <>
      <div className={`flex items-end gap-2.5 group relative w-full my-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {!isOwn && (
          <div className="w-7 shrink-0 self-end mb-1 select-none">
            {showAvatar ? (
              <Avatar className="h-7 w-7 border border-white/15 bg-purple-950">
                <AvatarImage src={message.sender.avatar ?? undefined} className="object-cover" />
                <AvatarFallback className="text-[10px] font-semibold bg-purple-900 text-white">
                  {message.sender.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : null}
          </div>
        )}

        <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
          <div className="flex items-end gap-2 relative group/bubble">
            <div
              className={`
                rounded-2xl px-4 py-2.5 text-sm leading-relaxed tracking-wide shadow-sm
                ${isOwn ? "bg-[#7C3AED] text-white rounded-br-xs shadow-purple-900/20" : "bg-[#181628]/90 border border-white/10 text-white rounded-bl-xs"}
                ${isDeleted ? "opacity-50 italic" : ""}
              `}
            >
              {isDeleted ? (
                <span className="text-xs text-gray-400 select-none">This message was deleted</span>
              ) : editing ? (
                <div className="flex gap-2 items-center min-w-48 py-0.5">
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEdit()
                      if (e.key === "Escape") setEditing(false)
                    }}
                    className="h-8 text-sm bg-transparent border-0 border-b border-white/40 rounded-none px-0 focus-visible:ring-0 text-white w-full"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-white hover:bg-white/10" onClick={handleEdit} disabled={saving}>
                      {saving ? "…" : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-300 hover:bg-white/10" onClick={() => setEditing(false)} disabled={saving}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  {message.content && <span className="whitespace-pre-wrap break-words">{message.content}</span>}
                  {message.attachments?.map((att) => (
                    <img key={att.id} src={att.url} alt="att" className="rounded-xl mt-2 max-h-64 max-w-full object-cover border border-white/15 cursor-pointer" onClick={() => setSelectedImage(att.url)} />
                  ))}
                </div>
              )}
            </div>

            {/* Edit / Delete Buttons on Hover */}
            {isOwn && !isDeleted && !editing && (
              <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity absolute -top-8 right-0 bg-[#141320] border border-white/15 rounded-lg shadow-xl px-1 py-0.5 flex items-center gap-1 z-10 select-none">
                {message.type === "TEXT" && (
                  <button onClick={() => { setEditing(true); setEditText(message.content ?? "") }} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors border-0 bg-transparent cursor-pointer" title="Edit">
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                <button onClick={() => setShowDeleteDialog(true)} className="p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-md transition-colors border-0 bg-transparent cursor-pointer" title="Delete">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1 mx-1 text-[10px] text-gray-400 select-none font-medium">
            <span>{timeStr}</span>
            {message.editedAt && !isDeleted && <span>· edited</span>}
            {isOwn && !isDeleted && (
              <span className="shrink-0 ml-0.5">
                {isRead ? <CheckCheck className="h-3.5 w-3.5 text-purple-300" /> : isDelivered ? <CheckCheck className="h-3.5 w-3.5 text-gray-400" /> : <Check className="h-3.5 w-3.5 text-gray-400" />}
              </span>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl bg-[#0C0C12]/95 border border-white/15 p-2 overflow-hidden flex items-center justify-center">
          {selectedImage && <img src={selectedImage} alt="Full preview" className="max-h-[85vh] max-w-full object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#12111C] border border-white/15 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Message?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">This will remove the message for all members in this conversation.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/15 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white border-0">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
