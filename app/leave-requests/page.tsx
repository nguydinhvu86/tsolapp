import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getMyLeaveRequests } from "@/app/hr/attendance/actions";
import LeaveRequestClient from "./LeaveRequestClient";
import { CalendarRange } from "lucide-react";

export const metadata = { title: "Xin Nghỉ Phép & Đơn Từ" };

export default async function LeaveRequestsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return <div>Unauthorized</div>;

    const requests = await getMyLeaveRequests();

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarRange size={24} style={{ color: 'var(--primary)' }} />
                    Đơn Từ & Nghỉ Phép
                </h1>
            </div>

            <LeaveRequestClient initialData={requests} />
        </div>
    );
}
