/*
The authenticated user and access token are required throughout the application.

Almost every API request (chat, profile, conversations, uploads, etc.)
requires an access token for authorization.

Instead of passing auth data through props or fetching it repeatedly,
we store it globally using Zustand so any component or API client can
access the current authentication state.

This store is responsible for:
- Current authenticated user
- Access token
- Authentication status
- Login
- Logout
- Updating user information

*/

import {create} from "zustand"

interface User{

}

interface AuthStore{
    user:User|null,
    accessToken:string|null,
    isAuthenticated:false,
    login:(user:User,accessToken:string) => void,
    logout:() => void,
    updateUser:(updates:Partial<User>)=>void //partial keyword in TS
    
}

export const useAuthStore = create((set) => {})