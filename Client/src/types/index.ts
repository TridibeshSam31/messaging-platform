export type User = {
    id:string,
    name:string,
    username:string,
    avatar:string|null ,
    status:"ONLINE"|"OFFLINE",
    lastSeen:string

}

export type Message = {
  id: string
  conversationId: string
  senderId: string
  type: "TEXT" | "IMAGE" | "VIDEO" | "FILE"
  content: string | null
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
  sender: {
    id: string
    name: string
    avatar: string | null
  }
  attachments: Attachment[]
  readReceipts: ReadReceipt[]   
  // Phase 6: id this client generated before sending (same on every retry)
  clientMessageId?: string | null
  // Phase 6: only on our own not-yet-confirmed messages; real server messages have no status
  status?: "sending" | "failed"
}

export type Attachment = {
    id:string,
    url:string,
    mimeType:string,
    size:number,
    fileName:string|null
}

export type ReadReceipt = {
  messageId: string
  userId: string
  readAt: string
  user: {
    id: string
    name: string
    avatar: string | null
  }
}

export type Conversation = {
    id:string
    type:"PRIVATE"|"GROUP",
    name:string|null
    avatar:string|null 
    lastMessage:Message|null
    members:ConversationMember[]
    unreadCount:number,
    updatedAt:string
}

export type ConversationMember = {
  userId: string
  role: "ADMIN" | "MEMBER"
  lastReadMessageId: string | null

  user: {
    id: string
    name: string
    username: string
    avatar: string
    status: "ONLINE" | "OFFLINE"
    lastSeen: string
  }
}

export type  UploadedFile = {
  url: string
  mimeType: string
  size: number
  fileName: string
}