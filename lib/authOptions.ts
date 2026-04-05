import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authenticator } from "@otplib/preset-default";
import { triggerPusherEvent } from "@/lib/pusher-server";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "admin@example.com" },
                password: { label: "Mật khẩu", type: "password" },
                token: { label: "Mã 2FA (nếu có)", type: "text" }
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Vui lòng nhập đầy đủ email và mật khẩu");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { permissionGroup: true }
                });

                if (!user || !user.password) {
                    // Cố gắng tìm và chứng thực quyền truy cập Customer
                    const customer = await prisma.customer.findUnique({
                        where: { email: credentials.email },
                    });
                    if (customer && customer.password) {
                        const isCustomerValid = await bcrypt.compare(credentials.password, customer.password);
                        if (!isCustomerValid) throw new Error("Mật khẩu khách hàng không đúng");
                        
                        await prisma.customer.update({
                            where: { id: customer.id },
                            data: { lastLoginAt: new Date() }
                        });

                        // Thông báo cho admin theo yêu cầu
                        try {
                            const managers = await prisma.user.findMany({
                                where: {
                                    OR: [
                                        { role: 'ADMIN' },
                                        { managedCustomers: { some: { id: customer.id } } }
                                    ]
                                },
                                select: { id: true }
                            });
                            
                            const notifs = managers.map(m => ({
                                userId: m.id,
                                title: "Khách hàng đăng nhập",
                                message: `Khách hàng ${customer.name} vừa đăng nhập vào hệ thống khách hàng.`,
                                type: "INFO",
                                link: `/customers/${customer.id}`
                            }));
                            if (notifs.length > 0) {
                                await prisma.notification.createMany({ data: notifs });
                            }
                            await triggerPusherEvent('admin-channel', 'customer-login', {
                                customerId: customer.id,
                                customerName: customer.name,
                                message: `Khách hàng ${customer.name} vửa đăng nhập.`
                            });
                        } catch (e) { console.error("Notification Error:", e) }

                        return {
                            id: customer.id,
                            email: customer.email,
                            name: customer.name,
                            role: "CUSTOMER",
                            avatar: null,
                            twoFactorEnabled: false,
                            permissions: []
                        };
                    }
                    throw new Error("Tài khoản không tồn tại");
                }

                if (!user.isActive) {
                    throw new Error("Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Admin.");
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Mật khẩu không chính xác");
                }

                // Check 2FA if enabled
                if (user.twoFactorEnabled) {
                    const providedToken = credentials.token?.trim() === "undefined" || !credentials.token?.trim() ? "" : credentials.token.trim();
                    if (!providedToken) {
                        throw new Error("2FA_REQUIRED");
                    }
                    // Set window to 10 (tolerates +/- 5 minutes clock drift)
                    authenticator.options = { window: 10 };

                    const isValidToken = authenticator.verify({
                        token: providedToken,
                        secret: user.twoFactorSecret!
                    });

                    if (!isValidToken) {
                        throw new Error("Mã 2FA không hợp lệ");
                    }
                }

                const userPerms = JSON.parse(user.permissions || "[]");
                const groupPerms = user.permissionGroup ? JSON.parse(user.permissionGroup.permissions || "[]") : [];

                // Legacy Map: Convert _VIEW to _VIEW_ALL + _VIEW_OWN dynamically until DB is updated
                const rawPerms = Array.from(new Set([...userPerms, ...groupPerms]));
                const mergedPerms = new Set<string>();
                for (const p of rawPerms) {
                    if (p.endsWith('_VIEW')) {
                        mergedPerms.add(p + '_ALL');
                        mergedPerms.add(p + '_OWN');
                    } else {
                        mergedPerms.add(p);
                    }
                }

                // Xác định thiết bị & IP
                const userAgent = (req?.headers as any)?.['user-agent'] || 'Bị ẩn/Không xác định';
                let platform = 'Khác';
                if (userAgent.includes('Windows')) platform = 'Windows';
                else if (userAgent.includes('Macintosh')) platform = 'MacOS';
                else if (userAgent.includes('Android')) platform = 'Android';
                else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'iOS';

                let browser = 'Khác';
                if (userAgent.includes('Chrome')) browser = 'Chrome';
                else if (userAgent.includes('Safari')) browser = 'Safari';
                else if (userAgent.includes('Firefox')) browser = 'Firefox';
                else if (userAgent.includes('Edge')) browser = 'Edge';

                const deviceStr = `${platform} - ${browser}`;
                const ipAddress = (req?.headers as any)?.['x-forwarded-for'] || '127.0.0.1';

                // Lưu lịch sử đăng nhập & cập nhật lastLoginAt
                try {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            lastLoginAt: new Date(),
                            currentPlatform: deviceStr
                        }
                    });

                    await (prisma as any).loginLog.create({
                        data: {
                            userId: user.id,
                            ipAddress,
                            userAgent,
                            platform: deviceStr
                        }
                    });
                } catch (e) {
                    console.error("Lỗi ghi log đăng nhập", e);
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar,
                    twoFactorEnabled: user.twoFactorEnabled,
                    permissions: Array.from(mergedPerms),
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
                    if (token.role === 'CUSTOMER') {
                        const dbCustomer = await prisma.customer.findUnique({
                            where: { id: token.id as string }
                        });
                        if (!dbCustomer) {
                            token.id = "";
                        }
                        return token; // Bỏ qua DB User Sync đối với Customer
                    }

                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        include: { permissionGroup: true }
                    });
                    if (dbUser) {
                        token.role = dbUser.role;
                        token.name = dbUser.name;
                        token.avatar = dbUser.avatar;
                        // Bảo vệ quyền của ADMIN khỏi bị ghi đè, vì quyền ADMIN được cấp động lúc đăng nhập (không lưu vào DB mảng array)
                        if (dbUser.role !== 'ADMIN') {
                            const userPerms = JSON.parse(dbUser.permissions || "[]");
                            const groupPerms = dbUser.permissionGroup ? JSON.parse(dbUser.permissionGroup.permissions || "[]") : [];
                            const rawPerms = Array.from(new Set([...userPerms, ...groupPerms]));

                            const upgradedPerms = new Set<string>();
                            for (const p of rawPerms) {
                                if (p.endsWith('_VIEW')) {
                                    const base = p.replace('_VIEW', '');
                                    // Only grant legacy VIEW_ALL access if the role hasn't been reconfigured with granular controls yet
                                    if (!rawPerms.includes(`${base}_VIEW_ALL`) && !rawPerms.includes(`${base}_VIEW_OWN`)) {
                                        upgradedPerms.add(`${base}_VIEW_ALL`);
                                        upgradedPerms.add(`${base}_VIEW_OWN`);
                                    }
                                } else {
                                    upgradedPerms.add(p);
                                }
                            }
                            token.permissions = Array.from(upgradedPerms);
                        }

                        // If user is deactivated during active session, invalidate them
                        if (!dbUser.isActive) {
                            token.id = "";
                        }
                    } else {
                        // User was deleted or database reset, invalidate session ID
                        token.id = "";
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
                session.user.name = token.name as string | null | undefined;
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
