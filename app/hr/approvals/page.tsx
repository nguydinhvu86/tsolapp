import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getPendingLeaveRequests } from "@/app/hr/attendance/actions";
import HrApprovalClient from "./HrApprovalClient";
import { CheckSquare } from "lucide-react";

export const metadata = { title: "Duyệt Đơn Nghỉ Phép" };

export default async function HrApprovalsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'HR'].includes(session.user.role)) return <div>Unauthorized</div>;

    const pendingRequests = await getPendingLeaveRequests();

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <CheckSquare className="w-6 h-6 text-indigo-600" /> Duyệt Đơn Nghỉ Phép
            </h1>
            <HrApprovalClient initialData={pendingRequests} />
        </div>
    );
}
