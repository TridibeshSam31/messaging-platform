import { useCallback, useRef } from "react"
import { sendWS } from "@/socket/index"
import { WS_EVENTS } from "@/components/utils/constants"

// How long we wait after the last keystroke before auto-emitting stop_typing —
// covers the case where the user stops typing without sending or clearing the box.
const TYPING_IDLE_MS = 2500

// Minimum gap between two `typing` sends while the user keeps typing, so we
// don't emit a WS message on every keystroke — matches typing.handler.ts,
// which just re-broadcasts whatever it receives with no throttling of its own.
const TYPING_RESEND_MS = 2000

export function useTyping(conversationId: string) {
  const isTypingRef = useRef(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSentAtRef = useRef(0)

  const stopTyping = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    if (isTypingRef.current) {
      isTypingRef.current = false
      sendWS({ type: WS_EVENTS.STOP_TYPING, roomId: conversationId })
    }
  }, [conversationId])

  const startTyping = useCallback(() => {
    const now = Date.now()
    if (!isTypingRef.current || now - lastSentAtRef.current > TYPING_RESEND_MS) {
      isTypingRef.current = true
      lastSentAtRef.current = now
      sendWS({ type: WS_EVENTS.TYPING, roomId: conversationId })
    }

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(stopTyping, TYPING_IDLE_MS)
  }, [conversationId, stopTyping])

  return { startTyping, stopTyping }
}