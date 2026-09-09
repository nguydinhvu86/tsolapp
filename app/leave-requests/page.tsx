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
        <div className="space-y-6 w-full">
            <LeaveRequestClient initialData={requests} />
        </div>
    );
}
