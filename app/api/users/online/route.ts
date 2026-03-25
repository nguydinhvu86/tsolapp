import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get users active in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

        const activeUsers = await (prisma as any).user.findMany({
            where: {
                lastActiveAt: {
                    gte: fiveMinutesAgo
                }
            },
            select: {
                id: true,
                name: true,
                avatar: true,
                lastActiveAt: true,
                currentPlatform: true
            },
            orderBy: {
                lastActiveAt: 'desc'
            }
        });

        const formattedUsers = activeUsers.map((u: any) => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar,
            lastActive: u.lastActiveAt.toISOString(),
            os: u.currentPlatform
        }));

        return NextResponse.json({ users: formattedUsers });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Something went wrong" }, { status: 500 });
    }
}
