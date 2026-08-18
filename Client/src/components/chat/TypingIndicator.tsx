import { useChatStore } from "@/stores/chatStore"
import { useAuthStore } from "@/stores/authStore"

interface Props {
  conversationId: string
}

export function TypingIndicator({ conversationId }: Props) {
  const { typingUsers, conversations } = useChatStore()
  const { user } = useAuthStore()

  const typers = typingUsers[conversationId]
  if (!typers || typers.size === 0) return null

  const conv = conversations.find((c) => c.id === conversationId)
  const names = Array.from(typers)
    .filter((id) => id !== user?.id)
    .map((id) => {
      const member = conv?.members.find((m) => m.userId === id)
      return member?.user.name ?? "Someone"
    })

  if (names.length === 0) return null

  const label =
    names.length === 1
      ? `${names[0]} is typing...`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing...`
      : "Several people are typing..."

  return (
    <div className="flex items-center gap-2 px-5 py-1 shrink-0 bg-transparent select-none">
      <div className="flex gap-1 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce3" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce3" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce3" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-[11px] text-gray-400 font-medium italic">{label}</span>
    </div>
  )
}
