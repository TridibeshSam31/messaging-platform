export type User = {
    id:string,
    name:string,
    username:string,
    avatar:string|null ,
    status:"ONLINE"|"OFFLINE",
    lastSeen:string

}

export type Message = {
    id:string,
    conversationId:string,
    senderId:string,
    type:"TEXT"|"IMAGE"|"VIDEO"|"FILE",
    content:string|null
    createdAt:string,
    editedAt:string|null
    deletedAt:string|null 
    sender:{
        id:string
        name:string
        avatar:string|null
    }
    attachments:Attachment[]
}


export type Attachment = {
    id:string,
    url:string,
    mimeType:string,
    size:number,
    fileName:string|null
}

export type ReadRecipt = {
    messageId :string,
    userId:string
    readAt:string
    user:{
        id:string
        name:string
        avatar:string|null
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
    userId:string,
    role:"ADMIN"|"MEMBER"
    user:{
        id:string,
        name:string,
        username:string,
        avatar:string,
        status:"ONLINE"|"OFFLINE"
        lastSeen:string
    }
}

export type  UploadedFile = {
  url: string
  mimeType: string
  size: number
  fileName: string
}