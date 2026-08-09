export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
export const MAX_FILES_PER_MESSAGE = 10

export const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf", "application/zip", "text/plain",
])

// Server has no mimetype→MessageType inference — the client sends `type`
// explicitly on POST /messages, so this needs to live somewhere shared.
export function getMessageTypeFromMime(mimeType: string): "IMAGE" | "VIDEO" | "FILE" {
  if (mimeType.startsWith("image/")) return "IMAGE"
  if (mimeType.startsWith("video/")) return "VIDEO"
  return "FILE"
}

// Your ws protocol's `type` field values — Server/src/socket/index.ts
// and the handlers in Server/src/socket/handlers/*.
export const WS_EVENTS = {
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  CHAT: "chat",
  TYPING: "typing",
  STOP_TYPING: "stop_typing",
  DELIVERED: "delivered",
  READ: "read",
  MESSAGE_ACK: "message_ack",
  MESSAGE_DELIVERED: "message_delivered",
  READ_RECEIPT: "read_receipt",
  USER_ONLINE: "user_online",
  USER_OFFLINE: "user_offline",
  USER_LEFT: "user_left",
  ERROR: "error",
} as const