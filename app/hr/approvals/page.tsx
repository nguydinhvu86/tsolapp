import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getAllLeaveRequestsForHR } from "@/app/hr/attendance/actions";
import HrApprovalClient from "./HrApprovalClient";
import { CheckSquare } from "lucide-react";

export const metadata = { title: "Duyệt Đơn Nghỉ Phép" };

export default async function HrApprovalsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'HR'].includes(session.user.role)) return <div>Unauthorized</div>;

    const allRequests = await getAllLeaveRequestsForHR();

    return (
        <div className="space-y-6 w-full">
            <HrApprovalClient initialData={allRequests} />
        </div>
    );
}
