import { useState } from "react";
import {useNavigate} from "react-router-dom"
import { toast } from "sonner";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

export function useAuth(){
    const[loading,setLoading] = useState(false)
    const {login , logout} = useAuthStore()
    const navigate = useNavigate()

    const handleLogin = async(username:string,password:string) => {

        setLoading(true)

        try {
            const result = await authApi.login(username,password) 
            login(result.user , result.accessToken)
            navigate("/chat")
            
        } catch (error:any) {
            //returning backend errors
            const msg = error.Response?.data?.error || "login failed"
            toast.error(msg)
            
            
        }finally{
            setLoading(false)
        }

    }

    const handleSignup = async (name:string , username:string,password:string) => {
        setLoading(true)

        try {
             const result = await authApi.signup(name , username , password)
             login(result.user , result.accessToken)
             navigate("/chat")
        } catch (error:any) {
            const msg = error.Response?.data?.error || "signup failed"
            toast.error(msg)
            
        }finally{
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        try{
            await authApi.logout()
        }catch{
          //ignoring the logout errors
        }
    }

    return {
        handleLogout , handleLogin , handleSignup


    }
}