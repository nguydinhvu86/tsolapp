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

export const config = {
    matcher: [
        "/((?!api/auth|api/callcenter|api/og-image|og-image\\.(?:png|jpg|jpeg|webp)|_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|icons/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$|login|forgot-password|reset-password|public|uploads|portal/login).*)"
    ]
};
