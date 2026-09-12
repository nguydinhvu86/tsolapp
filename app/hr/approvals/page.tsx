import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getAllLeaveRequestsForHR } from "@/app/hr/attendance/actions";
import HrApprovalClient from "./HrApprovalClient";

export const metadata = { title: "Duyệt Đơn Nghỉ Phép & Quản Lý HR" };

export default async function HrApprovalsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'HR'].includes(session.user.role)) return <div className="p-8 text-center text-slate-500">Bạn không có quyền truy cập trang Duyệt Đơn HR.</div>;

    const allRequests = await getAllLeaveRequestsForHR();

    return (
        <div className="space-y-6 w-full">
            <HrApprovalClient initialData={allRequests} currentUser={session.user} />
        </div>
    );
}
