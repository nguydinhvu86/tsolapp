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
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckSquare size={24} style={{ color: 'var(--primary)' }} />
                    Duyệt Đơn Nghỉ Phép
                </h1>
            </div>

            <HrApprovalClient initialData={allRequests} />
        </div>
    );
}
