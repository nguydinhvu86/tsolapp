import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userAgent = req.headers.get('user-agent') || '';
        let os = 'Web';
        if (userAgent.includes('Windows')) os = 'Windows';
        else if (userAgent.includes('Mac OS') || userAgent.includes('Macintosh')) os = 'macOS';
        else if (userAgent.includes('Android')) os = 'Android';
        else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
        else if (userAgent.includes('Linux')) os = 'Linux';

        const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { lastLoginAt: true } });
        const now = new Date();
        const updateData: any = {
            lastActiveAt: now,
            currentPlatform: os 
        };

        let isNewDaySession = false;
        if (!user?.lastLoginAt) {
            isNewDaySession = true;
        } else {
            const lastLoginDate = new Date(user.lastLoginAt);
            if (lastLoginDate.getDate() !== now.getDate() ||
                lastLoginDate.getMonth() !== now.getMonth() ||
                lastLoginDate.getFullYear() !== now.getFullYear()) {
                isNewDaySession = true;
            }
        }

        if (isNewDaySession) {
            updateData.lastLoginAt = now;
            const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
            try {
                await (prisma as any).loginLog.create({
                    data: {
                        userId: session.user.id,
                        ipAddress,
                        userAgent,
                        platform: os,
                        loginAt: now
                    }
                });
            } catch(e) {
                console.error("Error creating login log in heartbeat:", e);
            }
        }

        await (prisma as any).user.update({
            where: { id: session.user.id },
            data: updateData
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Something went wrong" }, { status: 500 });
    }
}
