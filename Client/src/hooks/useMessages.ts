import { useState } from "react";
import {toast} from "sonner"
import {messageApi} from "../api/message"
import { uploadApi } from "@/api/upload";
import { useChatStore } from "@/stores/chatStore";


export function useMessages(conversationId:string){
    const [loadingOld , setLoadingOld] = useState(false)
    const [sending , setSending] = useState(false)
    const { setMessages, addOlderMessages, cursors } = useChatStore()

    
    return {

    }
}