import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react"
import { Loader2, ArrowDown } from "lucide-react"

import { useChatStore } from "@/stores/chatStore"
import { useAuthStore } from "@/stores/authStore"
import { useMessages } from "@/hooks/useMessages"
import { MessageBubble } from "./MessageBubble"
import { sendWS } from "@/socket/index"

interface Props {
  conversationId: string
}

export function MessageList({ conversationId }: Props) {
  const {
    messages,
    cursors,
    updateLastRead,
    clearUnread,
    readReceiptsEnabled,
  } = useChatStore()

  const { user } = useAuthStore()

  const { loadingOld, loadOlderMessages } = useMessages(conversationId)

  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastIncomingMessageRef = useRef<HTMLDivElement>(null)

  const [atBottom, setAtBottom] = useState(true)
  const [newMessagesCount, setNewMessagesCount] = useState(0)

  const convMessages = messages[conversationId] ?? []

  const hasMore = !!cursors[conversationId]

  const prevMessagesLength = useRef(convMessages.length)

  const scrollHeightRef = useRef<number>(0)

  const prevFirstMsgId = useRef<string | undefined>(
    convMessages[0]?.id
  )

  /*
   * Store the latest incoming message that belongs to
   * someone else.
   *
   * This is the message we will observe to determine
   * whether the user has actually seen it.
   */
  const lastIncomingMessage = [...convMessages]
    .reverse()
    .find((msg) => msg.senderId !== user?.id)

  /*
   * Preserve scroll position when older messages are loaded.
   */
  useLayoutEffect(() => {
    const container = scrollContainerRef.current

    if (container) {
      scrollHeightRef.current = container.scrollHeight
    }
  }, [convMessages.length])

  useLayoutEffect(() => {
    const container = scrollContainerRef.current

    if (
      container &&
      scrollHeightRef.current &&
      !atBottom &&
      convMessages.length > prevMessagesLength.current
    ) {
      const firstMsgIndex = convMessages.findIndex(
        (m) => m.id === prevFirstMsgId.current
      )

      if (firstMsgIndex > 0) {
        const delta =
          container.scrollHeight - scrollHeightRef.current

        if (delta > 0) {
          container.scrollTop += delta
        }
      }
    }

    prevMessagesLength.current = convMessages.length
    prevFirstMsgId.current = convMessages[0]?.id
  }, [convMessages])

  /*
   * Keep the user at the bottom when they are already
   * at the bottom of the conversation.
   */
  useEffect(() => {
    if (atBottom) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      })
    }
  }, [convMessages.length, atBottom])

  /*
   * When switching conversations, move to the bottom
   * and reset the local new-message counter.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "instant",
    })

    setNewMessagesCount(0)

    prevMessagesLength.current = convMessages.length
    prevFirstMsgId.current = convMessages[0]?.id
  }, [conversationId])

  /*
   * Count new messages when the user is not at the bottom.
   */
  useEffect(() => {
    if (convMessages.length > prevMessagesLength.current) {
      const lastMessage =
        convMessages[convMessages.length - 1]

      if (
        !atBottom &&
        lastMessage &&
        lastMessage.senderId !== user?.id
      ) {
        setNewMessagesCount((prev) => prev + 1)
      }
    }
  }, [convMessages, atBottom, user?.id])

  /*
   * Clear the local new-message counter when the user
   * reaches the bottom.
   */
  useEffect(() => {
    if (atBottom) {
      setNewMessagesCount(0)
    }
  }, [atBottom])

  /*
   * Mark the latest incoming message as read ONLY when
   * it actually becomes visible in the viewport.
   *
   * Loading a message into the store does NOT mark it
   * as read anymore.
   */
  useEffect(() => {
    if (
      !readReceiptsEnabled ||
      !user ||
      !lastIncomingMessage
    ) {
      return
    }

    const element = lastIncomingMessageRef.current

    if (!element) {
      return
    }

    const messageId = lastIncomingMessage.id

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return
        }

        sendWS({
          type: "read",
          messageId,
          conversationId,
        })

        updateLastRead(
          conversationId,
          user.id,
          messageId
        )

        clearUnread(conversationId)

        observer.disconnect()
      },
      {
        threshold: 0.5,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [
    conversationId,
    lastIncomingMessage?.id,
    user?.id,
    readReceiptsEnabled,
    updateLastRead,
    clearUnread,
  ])

  /*
   * Load older messages when the top of the list
   * becomes visible.
   */
  useEffect(() => {
    const el = topRef.current

    if (!el || !hasMore || loadingOld) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadOlderMessages()
        }
      },
      {
        threshold: 0.1,
      }
    )

    observer.observe(el)

    return () => observer.disconnect()
  }, [hasMore, loadingOld, loadOlderMessages])

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget

      const nearBottom =
        el.scrollHeight -
          el.scrollTop -
          el.clientHeight <
        80

      setAtBottom(nearBottom)
    },
    []
  )

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    })

    setNewMessagesCount(0)
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-transparent">
      <div
        ref={scrollContainerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-2"
      >
        <div
          ref={topRef}
          className="h-1"
        />

        {loadingOld && (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
          </div>
        )}

        {convMessages.length === 0 && !loadingOld && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400 select-none">
            <p className="text-sm font-medium text-gray-300">
              No messages yet
            </p>

            <p className="text-xs text-gray-500 mt-0.5">
              Send a message to start the conversation.
            </p>
          </div>
        )}

        {convMessages.map((msg, i) => {
          const isOwn =
            msg.senderId === user?.id

          const prevMsg =
            convMessages[i - 1]

          const showAvatar =
            !isOwn &&
            (
              i === 0 ||
              prevMsg.senderId !== msg.senderId ||
              new Date(msg.createdAt).getTime() -
                new Date(prevMsg.createdAt).getTime() >
                120_000
            )

          const isLastIncomingMessage =
            !isOwn &&
            msg.id === lastIncomingMessage?.id

          return (
            <div
              key={msg.id}
              ref={
                isLastIncomingMessage
                  ? lastIncomingMessageRef
                  : undefined
              }
            >
              <MessageBubble
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
                conversationId={conversationId}
              />
            </div>
          )
        })}

        <div
          ref={bottomRef}
          className="h-1"
        />
      </div>

      {newMessagesCount > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl flex items-center gap-1.5 transition-all duration-200 cursor-pointer animate-bounce border border-purple-400/30"
        >
          <ArrowDown className="h-3.5 w-3.5" />

          {newMessagesCount}{" "}
          {newMessagesCount === 1
            ? "new message"
            : "new messages"}
        </button>
      )}
    </div>
  )
}