import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { password } = body;

        if (!password) {
            return NextResponse.json({ error: "Vui lòng nhập mật khẩu để xác nhận" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user || (!user.password && password)) {
            return NextResponse.json({ error: "Lỗi dữ liệu người dùng" }, { status: 400 });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return NextResponse.json({ error: "Mật khẩu không chính xác" }, { status: 400 });
        }

        // Disable 2FA
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
            }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to disable 2FA" }, { status: 500 });
    }
}
