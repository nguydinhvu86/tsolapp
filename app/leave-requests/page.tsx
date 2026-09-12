import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getMyLeaveRequests, getColleaguesForHandover } from "@/app/hr/attendance/actions";
import LeaveRequestClient from "./LeaveRequestClient";

export const metadata = { title: "Xin Nghỉ Phép & Đơn Từ" };

export default async function LeaveRequestsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return <div>Unauthorized</div>;

    const [requests, colleagues] = await Promise.all([
        getMyLeaveRequests(),
        getColleaguesForHandover()
    ]);

    return (
        <div className="space-y-6 w-full">
            <LeaveRequestClient 
                initialData={requests} 
                colleagues={colleagues} 
                currentUser={session.user} 
            />
        </div>
    );
}
