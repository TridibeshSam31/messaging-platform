import { useState } from "react"
import { format } from "date-fns"
import { MoreHorizontal, Pencil, Trash2, Check, CheckCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Button } from "../ui/button"
import { Input }  from "../ui/input"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "../ui/dropdown-menu"
import { useMessages } from "../../hooks/useMessages"
import type { Message } from "../../types"

interface Props {
  message: Message
  isMine: boolean      // did I send this message?
  showAvatar: boolean  // show sender avatar (grouped messages)
}

export function MessageBubble({ message, isMine, showAvatar }: Props) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.content ?? "")
  const { editMessage, deleteMessage } = useMessages(message.conversationId)

  const isDeleted = !!message.deletedAt
  const isEdited  = !!message.editedAt
  const isRead    = message.readReceipts.length > 0

  const initials = message.sender.name.slice(0, 2).toUpperCase()

  const saveEdit = async () => {
    if (editText.trim()) await editMessage(message.id, editText)
    setEditing(false)
  }

  return (
    <div className={`flex items-end gap-2 group ${isMine ? "flex-row-reverse" : "flex-row"}`}>

      {/* Sender avatar */}
      {!isMine && (
        showAvatar ? (
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={message.sender.avatar ?? undefined} />
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-7 shrink-0" /> // spacer to keep alignment
        )
      )}

      <div className={`flex flex-col max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>

        {/* Sender name (only for received messages, only first in group) */}
        {!isMine && showAvatar && (
          <span className="text-[10px] text-muted-foreground mb-1 pl-1">
            {message.sender.name}
          </span>
        )}

        {/* The bubble itself */}
        <div className={`
          px-3 py-2 text-sm rounded-2xl break-words
          ${isMine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
          }
          ${isDeleted ? "opacity-50 italic" : ""}
        `}>
          {isDeleted ? (
            <span>This message was deleted</span>
          ) : editing ? (
            // Inline edit mode
            <div className="space-y-2 min-w-40">
              <Input
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") saveEdit()
                  if (e.key === "Escape") setEditing(false)
                }}
                className="h-7 text-sm bg-black/20 border-white/20"
                autoFocus
              />
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="h-6 text-xs" onClick={saveEdit}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Attachment: image */}
              {message.attachments[0]?.mimeType.startsWith("image/") && (
                <img
                  src={message.attachments[0].url}
                  alt="attachment"
                  className="max-w-xs rounded-lg mb-1 cursor-pointer"
                  onClick={() => window.open(message.attachments[0].url, "_blank")}
                />
              )}
              {/* Attachment: file */}
              {message.attachments[0] && !message.attachments[0].mimeType.startsWith("image/") && (
                <a href={message.attachments[0].url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-xs underline mb-1">
                  📎 {message.attachments[0].fileName}
                </a>
              )}
              {/* Text */}
              {message.content && <p>{message.content}</p>}
            </>
          )}
        </div>

        {/* Time, edited label, read receipt */}
        <div className="flex items-center gap-1 mt-0.5 px-1">
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(message.createdAt), "HH:mm")}
          </span>
          {isEdited && !isDeleted && (
            <span className="text-[10px] text-muted-foreground">· edited</span>
          )}
          {isMine && !isDeleted && (
            isRead
              ? <CheckCheck className="h-3 w-3 text-primary" />
              : <Check className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Edit/Delete menu — only on your own non-deleted messages */}
      {isMine && !isDeleted && !editing && (
        <DropdownMenu>
          <DropdownMenuTrigger>
            {/* Only shows on hover (group class controls opacity) */}
            <Button variant="ghost" size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onClick={() => { setEditing(true); setEditText(message.content ?? "") }}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteMessage(message.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
