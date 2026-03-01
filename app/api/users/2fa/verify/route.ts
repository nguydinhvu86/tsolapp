import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { authenticator } from "@otplib/preset-default";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { secret, token } = body;

        if (!secret || !token) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const isValid = authenticator.verify({ token, secret });

        if (!isValid) {
            return NextResponse.json({ error: "Invalid token" }, { status: 400 });
        }

        // Save to DB and enable
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                twoFactorSecret: secret,
                twoFactorEnabled: true,
            }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Verification failed" }, { status: 500 });
    }
}
