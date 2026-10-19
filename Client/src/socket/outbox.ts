import { sendWS } from "./index"
import { useChatStore } from "@/stores/chatStore"
import { useSocketStore } from "@/stores/socketStore"
import { WS_EVENTS } from "@/components/utils/constants"
import type { Message, User } from "@/types"

// Phase 6 — Outbox: text messages waiting for the server's message_ack.
//
// Before: sendWS() silently DROPPED a message if the socket was down.
// Now:    every message stays here until the server confirms it, and is re-sent
//         (with the SAME clientMessageId) if no confirmation arrives. Re-sending is
//         safe because the server refuses to save the same clientMessageId twice.
//
// The outbox is also saved to localStorage, so a page refresh doesn't lose
// messages that were still "sending…" (or "failed", waiting for Retry).

// what we save — plain data only (timers can't be stored)
type SavedEntry = {
  roomId: string
  message: string
  clientMessageId: string
  createdAt: string
  status: "sending" | "failed"
}

// what we keep in memory — saved data + retry bookkeeping
type Entry = SavedEntry & {
  attempts: number
  timer?: ReturnType<typeof setTimeout>
}

// clientMessageId → entry
const entries = new Map<string, Entry>()

// whose outbox is loaded — one storage key per user, so two accounts on the
// same browser never see (or send!) each other's messages
let currentUserId: string | null = null

const ACK_TIMEOUT_MS = 8000 // no ack after 8s → try again
const MAX_ATTEMPTS = 3 // after 3 unanswered tries while online → show "failed"

const storageKey = (userId: string) => `chat_outbox:${userId}`

// ---------- persistence ----------

function save() {
  if (!currentUserId) return
  // strip attempts/timer — only plain data goes to storage
  const data: SavedEntry[] = [...entries.values()].map(
    ({ roomId, message, clientMessageId, createdAt, status }) => ({
      roomId,
      message,
      clientMessageId,
      createdAt,
      status,
    })
  )
  try {
    localStorage.setItem(storageKey(currentUserId), JSON.stringify(data))
  } catch {
    // storage full / blocked (private mode) → outbox still works, just not across refreshes
  }
}

// Called once per login: load what was pending before the refresh.
// "sending" ones are re-sent automatically when their room is (re)joined.
export function restoreOutbox(userId: string) {
  if (currentUserId === userId) return // already loaded for this user
  clearTimers()
  entries.clear()
  currentUserId = userId

  let saved: SavedEntry[]
  try {
    saved = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]")
  } catch {
    saved = [] // corrupted value (or storage blocked) → start empty rather than crash
  }
  for (const s of saved) entries.set(s.clientMessageId, { ...s, attempts: 0 })
}

// Called on logout: the message text shouldn't stay on a shared computer.
export function clearOutbox() {
  clearTimers()
  entries.clear()
  if (currentUserId) {
    try {
      localStorage.removeItem(storageKey(currentUserId))
    } catch {
      // ignore
    }
  }
  currentUserId = null
}

function clearTimers() {
  for (const e of entries.values()) if (e.timer) clearTimeout(e.timer)
}

// ---------- sending ----------

function attempt(e: Entry) {
  if (e.timer) clearTimeout(e.timer)

  // offline? don't burn an attempt — resendPendingForRoom() runs once we're back and rejoined
  if (!useSocketStore.getState().connected) return

  e.attempts++
  sendWS({
    type: WS_EVENTS.CHAT,
    roomId: e.roomId,
    message: e.message,
    clientMessageId: e.clientMessageId,
  })

  // if the ack hasn't removed us from `entries` by then, the send (or the ack) got lost
  e.timer = setTimeout(() => {
    if (!entries.has(e.clientMessageId)) return // acked in the meantime
    if (e.attempts >= MAX_ATTEMPTS) {
      markFailed(e)
      return
    }
    attempt(e)
  }, ACK_TIMEOUT_MS)
}

function markFailed(e: Entry) {
  e.status = "failed" // stays in the outbox (and storage) so Retry works even after a refresh
  save()
  useChatStore.getState().setMessageStatus(e.roomId, e.clientMessageId, "failed")
}

// Called when the user presses send.
export function queueMessage(roomId: string, message: string, clientMessageId: string, createdAt: string) {
  const e: Entry = { roomId, message, clientMessageId, createdAt, status: "sending", attempts: 0 }
  entries.set(clientMessageId, e)
  save() // saved BEFORE the first send, so even a refresh one millisecond later keeps it
  attempt(e)
}

// Called on message_ack (or our own chat broadcast): the server saved it, stop retrying.
export function confirmMessage(clientMessageId: string) {
  const e = entries.get(clientMessageId)
  if (!e) return
  if (e.timer) clearTimeout(e.timer)
  entries.delete(clientMessageId)
  save()
}

// Called on joined_room (after a reconnect the server only accepts chat for rooms
// we've re-joined, so this is the right moment to flush that room's pending messages).
export function resendPendingForRoom(roomId: string) {
  for (const e of entries.values()) {
    if (e.roomId === roomId && e.status === "sending") attempt(e)
  }
}

// Called by the "Retry" button on a failed message.
export function retryMessage(clientMessageId: string) {
  const e = entries.get(clientMessageId)
  if (!e) return
  e.status = "sending"
  e.attempts = 0
  save()
  useChatStore.getState().setMessageStatus(e.roomId, clientMessageId, "sending")
  attempt(e)
}

// ---------- showing outbox messages in the chat ----------

// The bubble we show before the server confirms. `id` is temporary — when the real
// message arrives, chatStore.addNewMessage finds it by clientMessageId and swaps it.
export function buildOptimisticMessage(
  e: Pick<SavedEntry, "roomId" | "message" | "clientMessageId" | "createdAt" | "status">,
  me: Pick<User, "id" | "name" | "avatar">
): Message {
  return {
    id: `pending-${e.clientMessageId}`,
    clientMessageId: e.clientMessageId,
    status: e.status,
    conversationId: e.roomId,
    senderId: me.id,
    type: "TEXT",
    content: e.message,
    createdAt: e.createdAt,
    editedAt: null,
    deletedAt: null,
    sender: { id: me.id, name: me.name, avatar: me.avatar },
    attachments: [],
    readReceipts: [],
  }
}

// After a conversation's messages load from the server (e.g. after a refresh),
// put its outbox messages back on screen. If the server already has one (the ack
// got lost right before the refresh), it's done — just drop it from the outbox.
export function restoreOutboxMessages(
  roomId: string,
  loaded: Message[],
  me: Pick<User, "id" | "name" | "avatar">
) {
  const savedIds = new Set(loaded.map((m) => m.clientMessageId).filter(Boolean))
  const { addNewMessage } = useChatStore.getState()

  for (const e of [...entries.values()]) {
    if (e.roomId !== roomId) continue
    if (savedIds.has(e.clientMessageId)) {
      confirmMessage(e.clientMessageId)
      continue
    }
    addNewMessage(buildOptimisticMessage(e, me), false, true)
  }
}
