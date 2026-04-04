import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import PortalSidebar from "./PortalSidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "CUSTOMER") {
        redirect("/portal/login");
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            <PortalSidebar customerName={session.user.name || "Khách hàng"} avatar={session.user.avatar} />
            <main className="flex-1 overflow-y-auto w-full p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
