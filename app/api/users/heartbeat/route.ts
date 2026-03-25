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

        await (prisma as any).user.update({
            where: { id: session.user.id },
            data: { 
                lastActiveAt: new Date(),
                currentPlatform: os 
            }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Something went wrong" }, { status: 500 });
    }
}
