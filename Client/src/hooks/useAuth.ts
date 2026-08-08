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
            
        } catch (error) {
            
            
        }

    }

    return {

    }
}