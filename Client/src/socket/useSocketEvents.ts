import { useEffect, useRef } from "react"
import { useAuthStore } from "@/stores/authStore"
import { useChatStore } from "@/stores/chatStore"
import { connectSocket, disconnectSocket, onWSMessage, sendWS, joinRoom, leaveRoom } from "./index"
import { WS_EVENTS } from "@/components/utils/constants"
import type { Message } from "@/types"

// One shared connection per logged-in session, opened here since ChatPage is
// the top-level thing that mounts for the whole "logged in" part of the app.
export function useSocketEvents() {
  const { user } = useAuthStore()
  const {
    addNewMessage,
    updateLastMessage,
    setTyping,
    markOnline,
    markOffline,
    updateLastRead,
    markDelivered,
  } = useChatStore()

  const hasConnectedRef = useRef(false)

  useEffect(() => {
    if (!user) {
      if (hasConnectedRef.current) {
        disconnectSocket()
        hasConnectedRef.current = false
      }
      return
    }

    connectSocket()
    hasConnectedRef.current = true

    const withDefaults = (m: Message): Message => ({ ...m, readReceipts: m.readReceipts ?? [] })

    const unsubscribe = onWSMessage((msg) => {
      switch (msg.type) {
        // Broadcast to everyone else in the room when another member sends
        // a message (chat.handler.ts skips the sender's own socket here).
        case WS_EVENTS.CHAT: {
    const message = withDefaults(msg.data as Message)

    const isIncoming = message.senderId !== user.id

    const isActiveConversation =
        useChatStore.getState().activeConversationId ===
        message.conversationId

    addNewMessage(
        message,
        isIncoming,
        isActiveConversation
    )

    updateLastMessage(
        message.conversationId,
        message
    )

    if (isIncoming) {
        sendWS({
            type: WS_EVENTS.DELIVERED,
            messageId: message.id,
        })
    }

    break
}

        // Sent only back to us, once our own WS `chat` send is persisted —
        // this is how our own sent message actually lands in our store,
        // since the `chat` broadcast above deliberately skips the sender.
       case WS_EVENTS.MESSAGE_ACK: {
    const message = withDefaults(msg.data as Message)

    addNewMessage(
        message,
        false,
        true
    )

    updateLastMessage(
        message.conversationId,
        message
    )

    break
}
        case WS_EVENTS.TYPING:
          setTyping(msg.roomId as string, msg.userId as string, true)
          break

        case WS_EVENTS.STOP_TYPING:
          setTyping(msg.roomId as string, msg.userId as string, false)
          break

        case WS_EVENTS.USER_ONLINE:
          markOnline(msg.userId as string)
          break

        case WS_EVENTS.USER_OFFLINE:
          markOffline(msg.userId as string)
          break

        // A 1-to-1 signal (reader -> original sender), not a room broadcast —
        // see read.handler.ts. conversationId comes straight from the event.
        case WS_EVENTS.READ_RECEIPT:
          updateLastRead(msg.conversationId as string, msg.readBy as string, msg.messageId as string)
          break

        // Also 1-to-1 and not persisted — delivered.handler.ts treats this as
        // a live-only signal, so there's nothing to reconcile on reconnect.
        case WS_EVENTS.MESSAGE_DELIVERED:
          markDelivered(msg.messageId as string)
          break

        case WS_EVENTS.ERROR:
          console.warn("[ws] server error:", msg.message)
          break

        // user_joined / joined_room / left_room / user_left: presence.handler.ts
        // sends these per-room join/leave notices, but nothing in the UI
        // needs them yet (online/offline already comes from USER_ONLINE/
        // USER_OFFLINE above) — ignored rather than guessed at.
      }
    })

    return unsubscribe
  }, [user])

  return { joinRoom, leaveRoom }
}