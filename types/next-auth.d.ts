import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: string
            avatar?: string | null
            twoFactorEnabled?: boolean
            permissions: string[]
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        role: string
        avatar?: string | null
        twoFactorEnabled?: boolean
        permissions: string[]
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: string
        avatar?: string | null
        twoFactorEnabled?: boolean
        permissions: string[]
    }
}
