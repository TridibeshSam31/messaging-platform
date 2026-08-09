import { useState, useRef } from "react"
import { Send, Paperclip, X } from "lucide-react"
import { Button }   from "../ui/button"
import { Textarea } from "../ui/textarea"
import { useMessages } from "../../hooks/useMessages"
import { useTyping }   from "../../hooks/useTyping"

export function MessageInput({ conversationId }: { conversationId: string }) {
  const [text, setText]   = useState("")
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { sendMessage, sending } = useMessages(conversationId)
  const { startTyping, stopTyping } = useTyping(conversationId)

  const send = async () => {
    if (!text.trim() && files.length === 0) return
    stopTyping()
    await sendMessage(text, files)
    setText("")
    setFiles([])
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()  // don't add a newline
      send()
    }
  }

  const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    startTyping()  // emit typing event
  }

  return (
    <div className="p-4 border-t border-border">

      {/* File previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
              <span>{file.name}</span>
              <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 bg-muted rounded-xl px-3 py-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
          }}
        />

        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
          onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="h-4 w-4" />
        </Button>

        <Textarea
          value={text}
          onChange={onTextChange}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 border-0 bg-transparent focus-visible:ring-0 resize-none min-h-0 py-1 px-0 text-sm"
        />

        <Button size="icon" className="h-8 w-8 shrink-0" onClick={send}
          disabled={sending || (!text.trim() && files.length === 0)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
