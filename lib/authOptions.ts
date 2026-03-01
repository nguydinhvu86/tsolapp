import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authenticator } from "@otplib/preset-default";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "admin@example.com" },
                password: { label: "Mật khẩu", type: "password" },
                token: { label: "Mã 2FA (nếu có)", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Vui lòng nhập đầy đủ email và mật khẩu");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                });

                if (!user || !user.password) {
                    throw new Error("Tài khoản không tồn tại");
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Mật khẩu không chính xác");
                }

                // Check 2FA if enabled
                if (user.twoFactorEnabled) {
                    if (!credentials.token) {
                        throw new Error("2FA_REQUIRED");
                    }
                    const isValidToken = authenticator.verify({
                        token: credentials.token,
                        secret: user.twoFactorSecret!
                    });

                    if (!isValidToken) {
                        throw new Error("Mã 2FA không hợp lệ");
                    }
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar,
                    twoFactorEnabled: user.twoFactorEnabled,
                    permissions: JSON.parse(user.permissions || "[]"),
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.avatar = user.avatar;
                token.twoFactorEnabled = user.twoFactorEnabled;
                token.permissions = user.permissions;
            }

            // Client-side updates via `useSession().update(...)`
            if (trigger === "update" && session) {
                if (session.avatar !== undefined) token.avatar = session.avatar;
                if (session.twoFactorEnabled !== undefined) token.twoFactorEnabled = session.twoFactorEnabled;
                if (session.permissions !== undefined) token.permissions = session.permissions;
            }

            // LIVE SYNC: On every session check, query DB to ensure role/permissions are still valid
            if (token?.id) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { role: true, permissions: true }
                    });
                    if (dbUser) {
                        token.role = dbUser.role;
                        token.permissions = JSON.parse(dbUser.permissions || "[]");
                    }
                } catch (error) {
                    console.error("JWT live DB sync failed", error);
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.avatar = token.avatar as string | null | undefined;
                session.user.twoFactorEnabled = token.twoFactorEnabled as boolean | undefined;
                session.user.permissions = (token.permissions as string[]) || [];
            }
            return session;
        }
    },
    pages: {
        signIn: '/login', // Định tuyến trang đăng nhập tùy chỉnh
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET || "super-secret-key-for-development",
};
