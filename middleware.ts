import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        if (req.nextUrl.pathname.startsWith('/portal/login')) {
            return NextResponse.next();
        }
    },
    {
        callbacks: {
            authorized: ({ req, token }) => {
                if (req.nextUrl.pathname.startsWith('/portal/login')) return true;
                return !!token;
            },
        },
    }
);

// Chặn toàn bộ các route ngoại trừ auth, _next (static files), api, login, forgot-password, reset-password và public (in ấn), mảng portal/login
export const config = {
    matcher: [
        "/((?!api/auth|api/callcenter|api/og-image|og-image.png|_next/static|_next/image|favicon.ico|login|forgot-password|reset-password|public|uploads|portal/login).*)"
    ]
};
