import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, X, Smile, Loader2, FileText } from "lucide-react"
import { useMessages } from "../../hooks/useMessages"
import { useTyping } from "../../hooks/useTyping"

interface Props {
  conversationId: string
}

const COMMON_EMOJIS = ["👍", "❤️", "🔥", "😂", "🎉", "👏", "✨", "🙏"]

export function MessageInput({ conversationId }: Props) {
  const [text, setText] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [showEmojis, setShowEmojis] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  const { sendMessage, sending } = useMessages(conversationId)
  const { startTyping, stopTyping } = useTyping(conversationId)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [text])

  // Click outside to close emoji picker
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojis(false)
      }
    }
    if (showEmojis) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showEmojis])

  const send = async () => {
    if ((!text.trim() && files.length === 0) || sending) return
    stopTyping()
    const content = text
    const attached = [...files]
    setText("")
    setFiles([])
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    await sendMessage(content, attached)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    startTyping()
  }

  const addEmoji = (emoji: string) => {
    setText((prev) => prev + emoji)
    setShowEmojis(false)
    textareaRef.current?.focus()
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const canSend = (text.trim().length > 0 || files.length > 0) && !sending

  return (
    <div className="p-3 md:p-3.5 border-t border-white/[0.08] bg-[#0c0d1c]/80 backdrop-blur-md relative select-none">
      {/* File Previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5 max-h-32 overflow-y-auto scrollbar-thin p-1">
          {files.map((file, i) => {
            const isImage = file.type.startsWith("image/")
            return (
              <div
                key={i}
                className="relative group flex items-center gap-2 bg-[#161830] border border-white/10 rounded-lg p-1.5 pr-2.5 text-xs text-white shadow-sm"
              >
                {isImage ? (
                  <div className="h-9 w-9 rounded overflow-hidden bg-black/40 shrink-0">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded bg-[#222648] flex items-center justify-center text-[#F59E0B] shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 max-w-[120px]">
                  <p className="truncate text-[11px] font-medium leading-tight">{file.name}</p>
                  <p className="text-[9px] text-[#6b7099] mt-0.5">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-1 h-4 w-4 rounded-full bg-white/10 hover:bg-rose-500/80 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer border-0"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojis && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-16 left-4 z-50 bg-[#141528] border border-white/15 rounded-xl p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center gap-1.5">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="h-8 w-8 text-base rounded-lg hover:bg-white/10 flex items-center justify-center transition-transform hover:scale-125 border-0 bg-transparent cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-end gap-1.5 bg-[#14162e]/90 border border-white/[0.09] focus-within:border-[#F59E0B]/50 rounded-2xl px-2.5 py-1.5 transition-all shadow-inner">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
            }
          }}
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 w-8 rounded-full text-[#8892c0] hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors border-0 bg-transparent cursor-pointer shrink-0"
          title="Attach files or photos"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojis((prev) => !prev)}
          className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors border-0 bg-transparent cursor-pointer shrink-0 ${
            showEmojis ? "text-[#F59E0B] bg-amber-500/10" : "text-[#8892c0] hover:text-white hover:bg-white/[0.08]"
          }`}
          title="Insert emoji"
        >
          <Smile className="h-4 w-4" />
        </button>

        {/* Multiline Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={onTextChange}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-transparent border-0 text-white placeholder:text-[#6b7099] text-xs md:text-sm focus:outline-none resize-none py-1.5 px-1 min-h-[24px] max-h-[120px] leading-relaxed scrollbar-thin"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          className={`h-8 w-8 rounded-full flex items-center justify-center transition-all border-0 cursor-pointer shrink-0 ${
            canSend
              ? "bg-gradient-to-tr from-[#D97706] to-[#F59E0B] text-black shadow-md shadow-amber-950/40 hover:opacity-90 active:scale-95"
              : "bg-white/[0.05] text-[#555a7a] cursor-not-allowed"
          }`}
          title="Send message"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin text-black" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}
