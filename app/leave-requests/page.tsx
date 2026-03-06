import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getMyLeaveRequests } from "@/app/hr/attendance/actions";
import LeaveRequestClient from "./LeaveRequestClient";

export const metadata = { title: "Xin Nghỉ Phép & Đơn Từ" };

export default async function LeaveRequestsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return <div>Unauthorized</div>;

    const requests = await getMyLeaveRequests();

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Đơn Từ & Nghỉ Phép</h1>
            <LeaveRequestClient initialData={requests} />
        </div>
    );
}
