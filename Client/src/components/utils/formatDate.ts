import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"

// "14:32" — inside a message bubble
export function formatMessageTime(dateString: string): string {
  return format(new Date(dateString), "HH:mm")
}

// "2 hours ago" — conversation list preview
export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true })
}

// "Last seen 3 hours ago" / "Last seen today at 14:32" — ChatHeader when user is offline
export function formatLastSeen(dateString: string): string {
  const date = new Date(dateString)
  if (isToday(date)) return `Last seen today at ${format(date, "HH:mm")}`
  if (isYesterday(date)) return `Last seen yesterday at ${format(date, "HH:mm")}`
  return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`
}