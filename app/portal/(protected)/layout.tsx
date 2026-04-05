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
        <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 overflow-hidden font-sans print:h-auto print:overflow-visible print:bg-white">
            <div className="print:hidden shrink-0">
                <PortalSidebar customerName={session.user.name || "Khách hàng"} avatar={session.user.avatar} />
            </div>
            <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 md:p-8 bg-slate-50/50 print:p-0 print:overflow-visible print:bg-white print:block">
                <div className="w-full h-full print:h-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
