import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { authenticator } from "@otplib/preset-default";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Generate a new secret
        const secret = authenticator.generateSecret();

        // Generate a provisioning URI using the user's email and a generic issuer name
        // (Ensure URL encode is safe characters)
        const userEmail = session.user.email;
        const appName = "CONTRACT_MGR";

        const uri = authenticator.keyuri(userEmail, appName, secret);

        return NextResponse.json({ secret, uri });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to generate 2FA" }, { status: 500 });
    }
}
