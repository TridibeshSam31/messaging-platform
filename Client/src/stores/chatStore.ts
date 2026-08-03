import {create} from "zustand"
import type { Conversation,Message } from "../types"

type ChatStore = {

    //list of conversations shown in the sidebar 
    conversations: Conversation[]

    //active conversation
    activeConversationId:string|null,

    
}