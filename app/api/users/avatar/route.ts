import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("avatar") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // create uploads directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), "uploads_data", "avatars");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filename = `${session.user.id}-${Date.now()}${path.extname(file.name)}`;
        const filepath = path.join(uploadDir, filename);

        fs.writeFileSync(filepath, buffer);

        const avatarUrl = `/api/files/avatars/${filename}`;

        await prisma.user.update({
            where: { id: session.user.id },
            data: { avatar: avatarUrl }
        });

        return NextResponse.json({ url: avatarUrl });
    } catch (e: any) {
        console.error('AVATAR_UPLOAD_ERROR:', e);
        return NextResponse.json({ error: e.message || "Something went wrong" }, { status: 500 });
    }
}
