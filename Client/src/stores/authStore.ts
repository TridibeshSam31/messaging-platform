/*

App Mount
        │
        ▼
loading = true
        │
        ▼
POST /auth/refresh
        │
   ┌────┴────┐
   │         │
Success    Failed
   │         │
login()   logout()
   │         │
loading=false
   │
Render App


there is one more approach that is to use persist from 
zustand middleware but there is a problem that would require localstorage
and that is not safe 
also we have to maintain a state called isLoggedIn because of which anyone can set is true and then 
wasily access the application which is not right






*/

import {create} from "zustand"
import type { User } from "../types"

type AuthStore = {
    //state
    user:User|null
    accessToken:string|null
    loading:boolean 
    
    //actions
    login:(user:User , accessToken:string) => void 
    logout:() => void
    setUser:(user:User|null) => void 
    setAccessToken:(token:string|null)=>void,
    setLoading:(loading:boolean) => void
    updateUser:(changes:Partial<User>) => void
}


export const useAuthStore = create<AuthStore>((set)=>({
    //set initial states

    user:null,
    accessToken:null
    loading:true,


    //write the defined actions

    login:(user,accessToken) =>{
        set({
            user,
            accessToken,
            loading:false
        })
    },

    

}))