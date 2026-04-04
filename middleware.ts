import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        // Có thể xử lý logic chi tiết ở đây nếu cần, ví dụ check Role:
        // if (req.nextUrl.pathname.startsWith("/settings") && req.nextauth.token?.role !== "ADMIN") {
        //     return NextResponse.rewrite(new URL("/dashboard", req.url))
        // }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

// Chặn toàn bộ các route ngoại trừ auth, _next (static files), api, login, forgot-password, reset-password và public (in ấn)
export const config = {
    matcher: [
        "/((?!api/auth|api/email|_next/static|_next/image|favicon.ico|login|forgot-password|reset-password|public|uploads).*)"
    ]
};
